/* -*- mode: js2 - indent-tabs-mode: nil - js2-basic-offset: 4 -*- */
/*jshint multistr:true */
/*jshint esnext:true */
/*global imports: true */
/*global global: true */
/*global log: true */
/**
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/

'use strict';

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const UPower = imports.gi.UPowerGlib;
const GLib = imports.gi.GLib;
const PanelMenu = imports.ui.panelMenu;
const Shell = imports.gi.Shell;
const MessageTray = imports.ui.messageTray;
const Atk = imports.gi.Atk;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain('gnome-shell-extension-espresso');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience =  imports.misc.extensionUtils;

const { loadInterfaceXML } = imports.misc.fileUtils;

// import our constants
Object.assign(globalThis, Me.imports.consts);

const ColorInterface = loadInterfaceXML("org.gnome.SettingsDaemon.Color");
const ColorProxy = Gio.DBusProxy.makeProxyWrapper(ColorInterface);

// for some reason the method Inhibit isn't in the schema so we can't just load the xml
const DBusSessionManagerIface = '<node>\
    <interface name="org.gnome.SessionManager">\
        <method name="Inhibit">\
            <arg type="s" direction="in" />\
            <arg type="u" direction="in" />\
            <arg type="s" direction="in" />\
            <arg type="u" direction="in" />\
            <arg type="u" direction="out" />\
        </method>\
        <method name="Uninhibit">\
            <arg type="u" direction="in" />\
        </method>\
        <method name="GetInhibitors">\
            <arg type="ao" direction="out" />\
        </method>\
        <signal name="InhibitorAdded">\
            <arg type="o" direction="out" />\
        </signal>\
        <signal name="InhibitorRemoved">\
            <arg type="o" direction="out" />\
        </signal>\
    </interface>\
</node>';

const DBusSessionManagerProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerIface);

const DisplayDeviceInterface = loadInterfaceXML("org.freedesktop.UPower.Device");
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const DBusSessionManagerInhibitorIface = loadInterfaceXML("org.gnome.SessionManager.Inhibitor");
const DBusSessionManagerInhibitorProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerInhibitorIface);

const IndicatorName = "Espresso";
const DisabledIcon = 'my-espresso-off-symbolic';
const EnabledIcon = 'my-espresso-on-symbolic';

let EspressoIndicator;
let ShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[1]);

const Espresso = GObject.registerClass(
class Espresso extends PanelMenu.Button {
    _init() {
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `=========New Session=======================================\nCalling super._init(null, ${IndicatorName})`);
        super._init(null, IndicatorName);

        /** a map of all gjs connections */
        this._connections = new Map();

        this.accessible_role = Atk.Role.TOGGLE_BUTTON;

        this._settings = Convenience.getSettings();
        this._connect(this._settings, `changed::${SHOW_INDICATOR_KEY}`, () => {
            if (this._settings.get_boolean(SHOW_INDICATOR_KEY))
                this.show();
            else
                this.hide();
        });
        if (!this._settings.get_boolean(SHOW_INDICATOR_KEY))
            this.hide();

        this._proxy = new ColorProxy(Gio.DBus.session, 'org.gnome.SettingsDaemon.Color', '/org/gnome/SettingsDaemon/Color', (proxy, error) => {
            if (error) {
                this.logEspressoMsg(`Error`,error.message);
                return;
            }
        });

        this._night_light = false;

        this._sessionManager = new DBusSessionManagerProxy(Gio.DBus.session,
                                                        'org.gnome.SessionManager',
                                                        '/org/gnome/SessionManager');
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `this._sessionManager is: ${this._sessionManager}`);
        this._connect(this._sessionManager, 'InhibitorAdded', this._inhibitorAdded.bind(this));
        this._connect(this._sessionManager, 'InhibitorRemoved', this._inhibitorRemoved.bind(this));

        // From auto-move-windows@gnome-shell-extensions.gcampax.github.com
        this._appSystem = Shell.AppSystem.get_default();

        this._appsChangedId = this._connect(this._appSystem, 'installed-changed', this._updateAppData.bind(this));

        // ("screen" in global) is false on 3.28, although global.screen exists
        if (typeof global.screen !== "undefined") {
            this._screen = global.screen;
            this._display = this._screen.get_display();
        }
        else {
            this._screen = global.display;
            this._display = this._screen;
        }

        this._monitor_manager = Meta.MonitorManager.get();

        this._icon = new St.Icon({
            style_class: 'system-status-icon'
        });
        this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${DisabledIcon}.svg`);

        this._state = false;
        // who has requested the inhibition
        this._last_app = "";
        this._last_cookie = "";
        this._apps = [];
        this._add_queue = new Set();
        this._delete_queue = new Set();
        this._lock = 0;
        this._cookies = [];
        this._objects = [];

        this.add_actor(this._icon);
        this.add_style_class_name('panel-status-button');
        this._connect(this, 'button-press-event', this.toggleState.bind(this));
        this._connect(this, 'touch-event', this.toggleState.bind(this));

        // Restore user state
        if (this._settings.get_boolean(USER_ENABLED_KEY) && this._settings.get_boolean(RESTORE_KEY)) {
            this.toggleState();
        }

        // Enable espresso when fullscreen app is running
        this._connect(this._screen, 'in-fullscreen-changed', this.toggleFullscreen.bind(this));
        this._connect(this._settings, `changed::${FULLSCREEN_KEY}`, this.toggleFullscreen.bind(this));
        this.toggleFullscreen();

        // Enable espresso when laptop is docked to external monitors
        this._connect(this._monitor_manager, 'monitors-changed', this.toggleCharging.bind(this));
        this._connect(this._settings, `changed::${DOCKED_KEY}`, this.toggleCharging.bind(this));

        // Create a battery proxy
        this.batteryProxy = new PowerManagerProxy(Gio.DBus.system, "org.freedesktop.UPower", "/org/freedesktop/UPower/devices/DisplayDevice", (proxy, error) => {
            if (error) {
                this.logEspressoMsg(ESPRESSO_ERROR_MSG,`Unable to obtain battery proxy: ${error.message}`);
            } else {
                // Enable espresso when charging
                this._connect(this.batteryProxy, 'g-properties-changed', this.toggleCharging.bind(this));
                this._connect(this._settings, `changed::${CHARGING_KEY}`, this.toggleCharging.bind(this));
                this.toggleCharging();
                this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `this.batteryProxy is: ${this.batteryProxy}`);

                this._batteryProxytimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                    // tell the settings widget whether or not we have a battery:
                    this._settings.set_boolean(HAS_BATTERY_KEY, this.hasBattery);
                });
            }
        });

        // Allow overriding
        this._connect(this._settings, `changed::${OVERRIDE_KEY}`, () => {
            if (!this._settings.get_boolean(OVERRIDE_KEY) && !this._state) {
                this.toggleFullscreen();
                this.toggleCharging();
            }
        });

        // React to night light settings
        this._connect(this._settings, `changed::${NIGHT_LIGHT_KEY}`, this._manageNightLight.bind(this));

        this._appConfigs = [];
        this._appData = new Map();

        this._connect(this._settings, `changed::${INHIBIT_APPS_KEY}`, this._updateAppConfigs.bind(this));
        this._updateAppConfigs();
    }

    /** returns whether the device has a battery */
    get hasBattery() {
        return this.batteryProxy?.IsPresent || false;
    }

    /** returns whether the device is currently receiving power */
    get isCharging() {
        if (!this.hasBattery) {
            // this isn't a battery-powered device
            return false;
        }

        return (this.batteryProxy.State === UPower.DeviceState.FULLY_CHARGED &&
                this.batteryProxy.TimeToEmpty === 0) ||
            // PENDING_CHARGE: power is connected and the battery is almost fully charged but the power manager is
            //                 delaying charging to prevent battery wear and extend its life
            this.batteryProxy.State === UPower.DeviceState.PENDING_CHARGE ||
            // CHARGING: power is connected and battery is charging
            this.batteryProxy.State === UPower.DeviceState.CHARGING;
    }

    get isDocked() {
        return this._screen.get_n_monitors() > 1 && this.isCharging;
    }

    get inFullscreen() {
        let nb_monitors = this._screen.get_n_monitors();
        let inFullscreen = false;
        for (let i=0; i<nb_monitors; i++) {
            if (this._screen.get_monitor_in_fullscreen(i)) {
                inFullscreen = true;
                break;
            }
        }
        return inFullscreen;
    }

    /**
     * Connects to a gjs object and listens to a specific signal.
     * Keeps track of all connections, for easier disconnection.
     *
     * @argument {Object} target - the gjs object to connect to
     * @argument {String} signal - the signal listen to
     * @argument {Function} hook - the function to invoke when the signal is emitted
     */
    _connect(target, signal, hook) {
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `this._connect called with\ntarget: ${target}\nsignal: ${signal}\nhook: ${hook}`);
        if (target) {
            if (!this._connections.has(target)) {
                this._connections.set(target, new Set());
            }

            const set = this._connections.get(target);
            let id;

            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Trying target.connect(${signal}, ${hook}`);
            try {
                id = target.connect(signal, hook);
            } catch (err) {
                this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Failed to connect target.connectSignal(${signal}, ${hook}`);
                id = target.connectSignal(signal, hook);
            }
            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Calling set.add(${id})`);
            set.add(id);
        }
    }

    /**
     * Disconnects all connected signals
     */
    _disconnectAll() {
        for (const [target, ids] of this._connections) {
            if (target) {

                for (const id of ids) {
                    try {
                        target.disconnect(id);
                    } catch (err) {
                        try {
                            target.disconnectSignal(id);
                        } catch (err) {
                            this.logEspressoMsg(ESPRESSO_ERROR_MSG,`Unable to disconnect signal`);
                        }
                    }
                }
            }
        }
    }

    toggleFullscreen() {
        this._toggleFullscreentimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            const enabled = this._settings.get_boolean(FULLSCREEN_KEY);
            const inhibited = this._apps.includes(FULLSCREEN_SYMBOL);

            if (this.inFullscreen && enabled && !inhibited) {
                this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Fullscreen state changed to true`);

                this.addInhibit(FULLSCREEN_SYMBOL);
                this._manageNightLight('disabled');
            }
        });

        const enabled = this._settings.get_boolean(FULLSCREEN_KEY);
        const inhibited = this._apps.includes(FULLSCREEN_SYMBOL);

        if ((!this.inFullscreen || !enabled) && inhibited) {
            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Fullscreen state changed to false`);

            this.removeInhibit(FULLSCREEN_SYMBOL);
            this._manageNightLight('enabled');
        }
    }

    toggleCharging() {
        if (this.hasBattery) {
            this._hasBatterytimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                const checkDocked = this._settings.get_boolean(DOCKED_KEY);
                const checkCharging = this._settings.get_boolean(CHARGING_KEY);
                const inhibitedByDock = this._apps.includes(DOCKED_SYMBOL);
                const inhibitedByCharging = this._apps.includes(CHARGING_SYMBOL);

                if (!inhibitedByDock || !inhibitedByCharging) {
                    if (this.isCharging) {
                        if (checkCharging && !inhibitedByCharging) {
                            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Charging state changed to true`);

                            this.addInhibit(CHARGING_SYMBOL);
                        }

                        if (checkDocked && this.isDocked && !inhibitedByDock) {
                            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Docked state changed to true`);

                            this.addInhibit(DOCKED_SYMBOL);
                        }

                        this._manageNightLight('disabled');
                    }
                }
            });
        }

        const checkDocked = this._settings.get_boolean(DOCKED_KEY);
        const checkCharging = this._settings.get_boolean(CHARGING_KEY);
        const inhibitedByDock = this._apps.includes(DOCKED_SYMBOL);
        const inhibitedByCharging = this._apps.includes(CHARGING_SYMBOL);

        if (inhibitedByDock || inhibitedByCharging) {
            if (!this.isCharging || !checkCharging) {
                this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Charging state changed to false`);

                this.removeInhibit(CHARGING_SYMBOL);

                if (inhibitedByDock && (!this.isDocked || !checkDocked)) {
                    this.logEspressoMsg(`Docked state changed to false`);

                    this.removeInhibit(DOCKED_SYMBOL);
                }

                this._manageNightLight('enabled');
            }
        }
    }

    toggleState() {
        const wasDocked = this._apps.includes(DOCKED_SYMBOL);
        const wasCharging = this._apps.includes(CHARGING_SYMBOL);
        const wasFullscreen = this._apps.includes(FULLSCREEN_SYMBOL);
        const wasByUser = this._apps.includes(USER_SYMBOL);
        const allowOverride = this._settings.get_boolean(OVERRIDE_KEY);

        //const prev_state = `${this._state?'on':'off'} ${wasByUser?'user ':''} ${wasDocked?'docked ':''} ${wasCharging?'charging ':''} ${wasFullscreen?'fullscreen ':''} ${allowOverride?'override':''}`;
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Toggle enabled. Previous state was ${this._state?'on':'off'} ${wasByUser?'user ':''} ${wasDocked?'docked ':''} ${wasCharging?'charging ':''} ${wasFullscreen?'fullscreen ':''} ${allowOverride?'override':''}`);
        
        if (this._state) {
            if (!allowOverride && (wasDocked || wasCharging || wasFullscreen)) {
                if (wasDocked) {
                    this._sendNotification(NOTIFY.DOCKED_OFF);
                    this._settings.set_boolean(DOCKED_KEY, false);
                }
                if (wasFullscreen) {
                    this._sendNotification(NOTIFY.FULLSCREEN_OFF);
                    this._settings.set_boolean(FULLSCREEN_KEY, false);
                }
                if (wasCharging) {
                    this._sendNotification(NOTIFY.CHARGING_OFF);
                    this._settings.set_boolean(CHARGING_KEY, false);
                }
            }

            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Removing all inhibitors`);

            this._apps.forEach(app_id => this.removeInhibit(app_id));
        }
        else {
            this.addInhibit(USER_SYMBOL);
            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `addInhibit called with ${USER_SYMBOL}`);
        }
    }

    addInhibit(app_id) {
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Requested to add inhibition by ${app_id}`);

        this._add_queue.add(app_id);
        this.processAddRemove();
    }

    removeInhibit(app_id) {
        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Requested to remove inhibition by ${app_id}`);

        this._delete_queue.add(app_id);
        this.processAddRemove();
    }

    processAddRemove() {
        if (this._lock) {
            // another task is still pending
            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Trying to process the queue but it is locked by ${this._lock} pending requests`);
            return;
        }

        if (this._add_queue.size > 0) {
            const app_id = this._add_queue.values().next().value;

            if (!this._delete_queue.has(app_id)) {
                ++this._lock;

                this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Locking the queue and requesting to add ${app_id}`);

                try {
                    this._sessionManager.InhibitRemote(app_id,
                        0, "Inhibit by %s".format(IndicatorName), 12,
                        cookie => {
                            this._last_cookie = cookie;
                            this._last_app = app_id;
                        });
                } catch (err) {
                    this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `InhibitRemote failed: ${err}`);
                }

            } else {
                this._add_queue.delete(app_id);
                this.processAddRemove();
            }
        } else if (this._delete_queue.size > 0) {
            const app_id = this._delete_queue.values().next().value;

            ++this._lock;
            this._add_queue.delete(app_id);

            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Locking the queue and requesting to remove ${app_id}`);

            const index = this._apps.indexOf(app_id);
            this._sessionManager.UninhibitRemote(this._cookies[index]);
        }
    }

    _inhibitorAdded(proxy, sender, [object]) {
        this._sessionManager.GetInhibitorsRemote(([inhibitors]) => {
            for(var i in inhibitors) {
                let inhibitor = new DBusSessionManagerInhibitorProxy(Gio.DBus.session,
                                                                    'org.gnome.SessionManager',
                                                                    inhibitors[i]);
                inhibitor.GetAppIdRemote(app_id => {
                    if (app_id != '' && app_id == this._last_app) {
                        if (this._last_app == USER_SYMBOL)
                            this._settings.set_boolean(USER_ENABLED_KEY, true);
                        this._apps.push(this._last_app);
                        this._add_queue.delete(this._last_app);
                        this._cookies.push(this._last_cookie);
                        this._objects.push(object);
                        this._last_app = "";
                        this._last_cookie = "";
                        if (this._state === false) {
                            this._state = true;
                            this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${EnabledIcon}.svg`);
                            this._sendNotification(NOTIFY.ENABLED);
                            this._manageNightLight();
                        }

                        this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Inhibitor added: ${app_id}, unlocking queue`);

                        --this._lock;
                        this.processAddRemove();
                    }
                });
            }
        });
    }

    _inhibitorRemoved(proxy, sender, [object]) {
        let index = this._objects.indexOf(object);

        if (index != -1) {
            const app_id = this._apps[index];

            if (app_id == USER_SYMBOL) {
                this._settings.set_boolean(USER_ENABLED_KEY, false);
            }

            // Remove app from list
            this._apps.splice(index, 1);
            this._cookies.splice(index, 1);
            this._objects.splice(index, 1);

            if (this._apps.length === 0) {
                this._state = false;
                this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${DisabledIcon}.svg`);
                this._sendNotification(NOTIFY.DISABLED);
                this._manageNightLight();
            }


            if (!this._apps.includes(app_id)) {
                this._delete_queue.delete(app_id);
            }

            this.logEspressoMsg(ESPRESSO_DEBUG_MSG, `Inhibitor removed: ${app_id}, unlocking queue`);

            --this._lock;
            this.processAddRemove();
        }
    }

    _manageNightLight(){
        if (this._settings.get_boolean(NIGHT_LIGHT_KEY) && this._proxy.NightLightActive && !this._settings.get_boolean(NIGHT_LIGHT_APP_ONLY_KEY)) {
            this._proxy.DisabledUntilTomorrow = this._state;
            this._night_light = true;
        } else {
            this._night_light = false;
        }
    }

    _sendNotification(state){
        if (!this._settings.get_boolean(SHOW_NOTIFICATIONS_KEY) || this.inFullscreen) {
            // suppress this notification
            return;
        }

        switch (state) {
        case NOTIFY.ENABLED:
            if (this._settings.get_boolean(NIGHT_LIGHT_KEY) && this._night_light && this._proxy.DisabledUntilTomorrow) {
                Main.notify(_('Auto suspend and screensaver disabled. Night Light paused.'));
            } else {
                Main.notify(_('Auto suspend and screensaver disabled'));
            }
            break;
        case NOTIFY.DISABLED:
            if (this._settings.get_boolean(NIGHT_LIGHT_KEY) && this._night_light && !this._proxy.DisabledUntilTomorrow) {
                Main.notify(_('Auto suspend and screensaver enabled. Night Light resumed.'));
            } else {
                Main.notify(_('Auto suspend and screensaver enabled'));
            }
            break;
        case NOTIFY.DOCKED_OFF:
            Main.notify(_('Turning off "espresso enabled when docked"'));
            break;
        case NOTIFY.CHARGING_OFF:
            Main.notify(_('Turning off "espresso enabled when charging"'));
            break;
        case NOTIFY.FULLSCREEN_OFF:
            Main.notify(_('Turning off "espresso enabled when fullscreen"'));
        }
    }

    _updateAppConfigs() {
        this._appConfigs.length = 0;
        this._settings.get_strv(INHIBIT_APPS_KEY).forEach(appId => {
            this._appConfigs.push(appId);
        });
        this._updateAppData();
    }

    _updateAppData() {
        let ids = this._appConfigs.slice()
        let removedApps = [...this._appData.keys()]
            .filter(a => !ids.includes(a.id));
        removedApps.forEach(app => {
            app.disconnect(this._appData.get(app).windowsChangedId);
            let id = app.get_id();
            this._appData.delete(app);
        });
        let addedApps = ids
            .map(id => this._appSystem.lookup_app(id))
            .filter(app => app && !this._appData.has(app));
        addedApps.forEach(app => {
            let data = {
                windowsChangedId: app.connect('windows-changed',
                    this._appWindowsChanged.bind(this)),
            };
            let id = app.get_id();
            this._appData.set(app, data);
        });
    }

    _appWindowsChanged(app) {
        let app_id = app.get_id();
        let appState = app.get_state();
        // app is STARTING (1) or RUNNING (2)
        if ((appState == 1) || (appState == 2)) {
            this.addInhibit(app_id);
            if (this._settings.get_boolean(NIGHT_LIGHT_KEY) && this._proxy.NightLightActive) {
                this._proxy.DisabledUntilTomorrow = true;
                this._night_light = true;
            } else {
                this._night_light = false;
            }
        // app is STOPPED (0)
        } else {
            this.removeInhibit(app_id);
            if (this._settings.get_boolean(NIGHT_LIGHT_KEY) && this._proxy.NightLightActive) {
                this._proxy.DisabledUntilTomorrow = false;
                this._night_light = true;
            } else {
                this._night_light = false;
            }
        }
    }

    // Check msgtype and determine whether or not to write a message to the log. Write if the 
    // message type is not ESPRESSO_DEBUG_MSG or if the ESPRESSO_ENABLE_DEBUG flag is set.
    logEspressoMsg(msgtype, msgcontent){
        if ( (msgtype!=ESPRESSO_DEBUG_MSG) || ESPRESSO_ENABLE_DEBUG) {
            msgcontent = msgcontent.replace(/\n/g,`\nEspresso: ${msgtype}: `);
            log(`Espresso: ${msgtype}: ${msgcontent}`);
        }
    }

    destroy() {
        // remove all inhibitors
        this._apps.forEach(app_id => this.removeInhibit(app_id));
        // disconnect from signals
        this._disconnectAll();
        this._appConfigs.length = 0;
        this._updateAppData();
        // cleanup GLib loops
        if(this._batteryProxytimeout) {
            GLib.Source.remove(this._batteryProxytimeout);
            this._batteryProxytimeout = null;
        }
        if(this._hasBatterytimeout) {
            GLib.Source.remove(this._hasBatterytimeout);
            this._hasBatterytimeout = null;
        }
        if(this._toggleFullscreentimeout) {
            GLib.Source.remove(this._toggleFullscreentimeout);
            this._toggleFullscreentimeout = null;
        }
        super.destroy();
    }
});

function init(extensionMeta) {
    Convenience.initTranslations();
}

function enable() {
    EspressoIndicator = new Espresso();
    Main.panel.addToStatusArea(IndicatorName, EspressoIndicator);
}

function disable() {
    EspressoIndicator.destroy();
    EspressoIndicator = null;
}
