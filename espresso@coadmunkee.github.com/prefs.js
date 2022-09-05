// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
// Adapted from auto-move-windows@gnome-shell-extensions.gcampax.github.com
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

// set to true to make the settings update automatically
const REACTIVE_SETTINGS = true;

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Adw = imports.gi.Adw;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;
const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain('gnome-shell-extension-espresso');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// import our constants
Object.assign(globalThis, Me.imports.consts);

const Columns = {
    APPINFO: 0,
    DISPLAY_NAME: 1,
    ICON: 2
};

let MajorShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[0]);
let ShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[1]);

class EspressoWidget {
    constructor(params) {
        if (params === undefined) {
            params={};
        }
        params.margin_top=10;
        params.margin_start=10;
        params.margin_end=10;
        params.margin_bottom=10;
        params.row_spacing=6;

        this.w = new Gtk.Grid(params);
        this.w.set_orientation(Gtk.Orientation.VERTICAL);

        this._settings = ExtensionUtils.getSettings();
        this._settings.connect('changed', this._refresh.bind(this));
        this._changedPermitted = false;


        let showEspressoBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                           spacing: 7});

        let showEspressoLabel = new Gtk.Label({label: _("Show Espresso in top panel"),
                                               hexpand: true,
                                               xalign: 0});

        let showEspressoSwitch = new Gtk.Switch({active: this._settings.get_boolean(SHOW_INDICATOR_KEY)});
        showEspressoSwitch.connect('notify::active', button => {
            this._settings.set_boolean(SHOW_INDICATOR_KEY, button.active);
        });

        showEspressoBox.prepend(showEspressoLabel);
        showEspressoBox.append(showEspressoSwitch);

        this.w.attach(showEspressoBox, 0, 0, 1, 1);

        const gtkhbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                    spacing: 7});

        const enableFullscreenLabel = new Gtk.Label({label: _("Enable when a fullscreen application is running"),
                                            hexpand: true,
                                            xalign: 0});

        const enableFullscreenSwitch = new Gtk.Switch({active: this._settings.get_boolean(FULLSCREEN_KEY)});
        enableFullscreenSwitch.connect('notify::active', button => {
            this._settings.set_boolean(FULLSCREEN_KEY, button.active);
        });

        // update visually in this prefs widget when modified elsewhere:
        if (REACTIVE_SETTINGS) this._settings.connect(`changed::${FULLSCREEN_KEY}`, () => {
            Mainloop.timeout_add_seconds(1, () => {
                enableFullscreenSwitch.set_active(this._settings.get_boolean(FULLSCREEN_KEY));
            });
        });

        gtkhbox.prepend(enableFullscreenLabel);
        gtkhbox.append(enableFullscreenSwitch);

        this.w.attach(gtkhbox, 0, 1, 1, 1);

        const stateBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 7});

        const stateLabel = new Gtk.Label({label: _("Restore state across reboots"),
                                hexpand: true,
                                xalign: 0});

        const stateSwitch = new Gtk.Switch({active: this._settings.get_boolean(RESTORE_KEY)});
        stateSwitch.connect('notify::active', button => {
        this._settings.set_boolean(RESTORE_KEY, button.active);
        });

        stateBox.prepend(stateLabel);
        stateBox.append(stateSwitch);

        this.w.attach(stateBox, 0, 2, 1, 1);

        const notificationsBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                            spacing: 7});

        const notificationsLabel = new Gtk.Label({label: _("Enable notifications"),
                                        hexpand: true,
                                        xalign: 0});

        const notificationsSwitch = new Gtk.Switch({active: this._settings.get_boolean(SHOW_NOTIFICATIONS_KEY)});
        notificationsSwitch.connect('notify::active', button => {
        this._settings.set_boolean(SHOW_NOTIFICATIONS_KEY, button.active);
        });

        notificationsBox.prepend(notificationsLabel);
        notificationsBox.append(notificationsSwitch);

        this.w.attach(notificationsBox, 0, 3, 1, 1);

        const nightlightBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 7});

        const nightlightLabel = new Gtk.Label({label: _("Pause/resume Night Light if enabled"),
                                                hexpand: true,
                                                xalign: 0,
                                                max_width_chars: 25});


        const nightlightSwitch = new Gtk.Switch({active: this._settings.get_boolean(NIGHT_LIGHT_KEY)});
        nightlightSwitch.connect('notify::active', button => {
            this._settings.set_boolean(NIGHT_LIGHT_KEY, button.active);
        });

        nightlightBox.prepend(nightlightLabel);
        nightlightBox.append(nightlightSwitch);

        this.w.attach(nightlightBox, 0, 4, 1, 1);

        const nightlightAppBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                spacing: 7});

        const nightlightAppLabel = new Gtk.Label({label: _("Pause/resume Night Light for defined applications only"),
                                                    hexpand: true,
                                                    xalign: 0});

        const nightlightAppSwitch = new Gtk.Switch({active: this._settings.get_boolean(NIGHT_LIGHT_APP_ONLY_KEY)});
        nightlightAppSwitch.connect('notify::active', button => {
            this._settings.set_boolean(NIGHT_LIGHT_APP_ONLY_KEY, button.active);
        });
        nightlightSwitch.connect('notify::active', button => {
            if (button.active) {
                nightlightAppSwitch.set_sensitive(true);
            } else {
                nightlightAppSwitch.set_active(false);
                nightlightAppSwitch.set_sensitive(false);
            }
        });

        nightlightAppBox.prepend(nightlightAppLabel);
        nightlightAppBox.append(nightlightAppSwitch);

        this.w.attach(nightlightAppBox, 0, 5, 1, 1);

        const dockedbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                    spacing: 7});

        const enableDockedLabel = new Gtk.Label({label: _("Enable when charging and docked to external monitors"),
                                                hexpand: true,
                                                xalign: 0,
                                                sensitive: this._settings.get_boolean(HAS_BATTERY_KEY)});

        const enableDockedSwitch = new Gtk.Switch({
            active: this._settings.get_boolean(DOCKED_KEY),
            sensitive: this._settings.get_boolean(HAS_BATTERY_KEY),
        });
        enableDockedSwitch.connect('notify::active', button => {
            this._settings.set_boolean(DOCKED_KEY, button.active);
        });

        // update visually in this prefs widget when modified elsewhere:
        if (REACTIVE_SETTINGS) this._settings.connect(`changed::${DOCKED_KEY}`, () => {
            Mainloop.timeout_add_seconds(1, () => {
                enableDockedSwitch.set_active(this._settings.get_boolean(DOCKED_KEY));
            });
        });

        dockedbox.prepend(enableDockedLabel);
        dockedbox.append(enableDockedSwitch);

        this.w.attach(dockedbox, 0, 6, 1, 1);

        const chargingbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                       spacing: 7});

        const enableChargingLabel = new Gtk.Label({label: _("Enable when this device is charging"),
                                                 hexpand: true,
                                                 xalign: 0,
                                                 sensitive: this._settings.get_boolean(HAS_BATTERY_KEY)});

        const enableChargingSwitch = new Gtk.Switch({
            active: this._settings.get_boolean(CHARGING_KEY),
            sensitive: this._settings.get_boolean(HAS_BATTERY_KEY),
        });
        enableChargingSwitch.connect('notify::active', button => {
            this._settings.set_boolean(CHARGING_KEY, button.active);
        });

        // update visually in this prefs widget when modified elsewhere:
        if (REACTIVE_SETTINGS) this._settings.connect(`changed::${CHARGING_KEY}`, () => {
            Mainloop.timeout_add_seconds(1, () => {
                enableChargingSwitch.set_active(this._settings.get_boolean(CHARGING_KEY));
            });
        });

        chargingbox.prepend(enableChargingLabel);
        chargingbox.append(enableChargingSwitch);

        this.w.attach(chargingbox, 0, 7, 1, 1);

        const overridebox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                                        spacing: 7});

        const enableOverrideLabel = new Gtk.Label({label: _("Allow to temporarily override without affecting my settings"),
                                                 hexpand: true,
                                                 xalign: 0});

        const enableOverrideSwitch = new Gtk.Switch({active: this._settings.get_boolean(OVERRIDE_KEY)});
        enableOverrideSwitch.connect('notify::active', button => {
            this._settings.set_boolean(OVERRIDE_KEY, button.active);
        });

        overridebox.prepend(enableOverrideLabel);
        overridebox.append(enableOverrideSwitch);

        this.w.attach(overridebox, 0, 8, 1, 1);

        this._store = new Gtk.ListStore();
        this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);

        this._treeView = new Gtk.TreeView({ model: this._store,
                                            hexpand: true, vexpand: true });
        this._treeView.set_size_request(-1, 80); // min height for the app list
        this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        const appColumn = new Gtk.TreeViewColumn({ expand: true, sort_column_id: Columns.DISPLAY_NAME,
                                                title: _("Applications which enable Espresso automatically") });
        const iconRenderer = new Gtk.CellRendererPixbuf;
        appColumn.pack_start(iconRenderer, false);
        appColumn.add_attribute(iconRenderer, "gicon", Columns.ICON);
        const nameRenderer = new Gtk.CellRendererText;
        appColumn.pack_start(nameRenderer, true);
        appColumn.add_attribute(nameRenderer, "text", Columns.DISPLAY_NAME);
        this._treeView.append_column(appColumn);

        this.w.attach(this._treeView, 0, 9, 1, 1);

        const toolbar = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});

        const newButton = new Gtk.Button( { icon_name : 'list-add-symbolic' });
        newButton.connect('clicked', this._createNew.bind(this));
        toolbar.prepend(newButton);

        const delButton = new Gtk.Button( { icon_name : 'list-remove-symbolic' });
        delButton.connect('clicked', this._deleteSelected.bind(this));
        toolbar.append(delButton);

        this.w.attach(toolbar, 0, 10, 1, 1);

        const togglekeyBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 7});

        const togglekeyLabel = new Gtk.Label({label: _("Current Hotkey to toggle Espresso on/off"),
                                hexpand: true,
                                xalign: 0});

        const togglekeyName = this._settings.get_strv(HOTKEY_KEY);

        const togglekeyButton = new Gtk.Button({label : togglekeyName.toString()});
//        stateSwitch.connect('notify::active', button => {
//        this._settings.set_strv(HOTKEY_KEY, button.active);
//        });

        togglekeyButton.connect('clicked', () => {
            let dialog = new HotkeyDialog(this._settings, this);
            dialog.show();
            dialog.connect('response', (_w, response) => {
                if(response === Gtk.ResponseType.APPLY) {
                    this._settings.set_strv(HOTKEY_KEY, [dialog.resultsText]);
                    togglekeyButton.label = dialog.resultsText;
                    // shortcutCell.accelerator = dialog.resultsText;
                    dialog.destroy();
                }
                else {
                    togglekeyButton.label = this._settings.get_strv(HOTKEY_KEY).toString();
                    //shortcutCell.accelerator = this._settings.get_strv(HOTKEY_KEY).toString();
                    dialog.destroy();
                }
            });
        });

        togglekeyBox.prepend(togglekeyLabel);
        togglekeyBox.append(togglekeyButton);

        this.w.attach(togglekeyBox, 0, 11, 1, 1);
        
        this._changedPermitted = true;
        this._refresh();
    }

    _createNew() {
        const dialog = new NewInhibitDialog(this.w.get_root());
        dialog.connect('response', (dlg, id) => {
            const appInfo = id === Gtk.ResponseType.OK
                ? dialog.get_widget().get_app_info() : null;
            if (appInfo) {
                this._changedPermitted = false;
                if (!this._appendItem(appInfo.get_id())) {
                    this._changedPermitted = true;
                    return;
                }
                let iter = this._store.append();

                this._store.set(iter,
                                [Columns.APPINFO, Columns.ICON, Columns.DISPLAY_NAME],
                                [appInfo, appInfo.get_icon(), appInfo.get_display_name()]);
                this._changedPermitted = true;
            }
            dialog.destroy();
        });
        dialog.show();
    }

    _deleteSelected() {
        const [any, , iter] = this._treeView.get_selection().get_selected();

        if (any) {
            const appInfo = this._store.get_value(iter, Columns.APPINFO);

            this._changedPermitted = false;
            this._removeItem(appInfo.get_id());
            this._store.remove(iter);
            this._changedPermitted = true;
        }
    }

    _refresh() {
        if (!this._changedPermitted)
            // Ignore this notification, model is being modified outside
            return;

        this._store.clear();

        const currentItems = this._settings.get_strv(INHIBIT_APPS_KEY);
        const validItems = [ ];
        for (let i = 0; i < currentItems.length; i++) {
            const id = currentItems[i];
            const appInfo = Gio.DesktopAppInfo.new(id);
            if (!appInfo)
                continue;
            validItems.push(currentItems[i]);

            const iter = this._store.append();
            this._store.set(iter,
                            [Columns.APPINFO, Columns.ICON, Columns.DISPLAY_NAME],
                            [appInfo, appInfo.get_icon(), appInfo.get_display_name()]);
        }

        if (validItems.length != currentItems.length) // some items were filtered out
            this._settings.set_strv(INHIBIT_APPS_KEY, validItems);
    }

    _appendItem(id) {
        const currentItems = this._settings.get_strv(INHIBIT_APPS_KEY);

        if (currentItems.includes(id)) {
            printerr("Already have an item for this id");
            return false;
        }

        currentItems.push(id);
        this._settings.set_strv(INHIBIT_APPS_KEY, currentItems);
        return true;
    }

    _removeItem(id) {
        const currentItems = this._settings.get_strv(INHIBIT_APPS_KEY);
        const index = currentItems.indexOf(id);

        if (index < 0)
            return;

        currentItems.splice(index, 1);
        this._settings.set_strv(INHIBIT_APPS_KEY, currentItems);
    }
}

const NewInhibitDialog = GObject.registerClass(
    class NewInhibitDialog extends Gtk.AppChooserDialog {
        _init(parent) {
            super._init({
                transient_for: parent,
                modal: true
            });

            this._settings = ExtensionUtils.getSettings();

            this.get_widget().set({
                show_all: true,
                show_other: true
            });

            this.get_widget().connect('application-selected',
                this._updateSensitivity.bind(this));
            this._updateSensitivity();
        }

        _updateSensitivity() {
            const rules = this._settings.get_strv(INHIBIT_APPS_KEY);
            const appInfo = this.get_widget().get_app_info();
            this.set_response_sensitive(Gtk.ResponseType.OK,
                appInfo && !rules.some(i => i.startsWith(appInfo.get_id())));
        }
    });

function init() {
    ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    const widget = new EspressoWidget();
    return widget.w;
}

var HotkeyDialog = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},
class Espresso_HotkeyDialog extends Gtk.Window {
    _init(settings, parent) {
        this._settings = settings;
        this.keyEventController = new Gtk.EventControllerKey();

        super._init({
            modal: true,
            title: _("Set Custom Hotkey") //,
//            transient_for: parent.get_root()
        });
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
            hexpand: true,
            halign: Gtk.Align.FILL
        });
        this.set_child(vbox);
        this._createLayout(vbox);
        this.add_controller(this.keyEventController);
        this.set_size_request(500, 250);
    }

    _createLayout(vbox) {
        let hotkeyKey = '';

        let modFrame = new Adw.PreferencesGroup()
        let modRow = new Adw.ActionRow({
            title: _("Choose Modifiers")
        });

        let buttonBox = new Gtk.Box({
            hexpand: true,
            halign: Gtk.Align.END,
            spacing: 5
        });
        modRow.add_suffix(buttonBox);
        let ctrlButton = new Gtk.ToggleButton({
            label: _("Ctrl"),
            valign: Gtk.Align.CENTER
        });
        let superButton = new Gtk.ToggleButton({
            label: _("Super"),
            valign: Gtk.Align.CENTER
        });
        let shiftButton = new Gtk.ToggleButton({
            label: _("Shift"),
            valign: Gtk.Align.CENTER
        });
        let altButton = new Gtk.ToggleButton({
            label: _("Alt"),
            valign: Gtk.Align.CENTER
        });
        ctrlButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        superButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        shiftButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        altButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        buttonBox.append(ctrlButton);
        buttonBox.append(superButton);
        buttonBox.append(shiftButton);
        buttonBox.append(altButton);
        modFrame.add(modRow);
        vbox.append(modFrame);

        let keyFrame = new Adw.PreferencesGroup();
        let keyLabel = new Gtk.Label({
            label: _("Press any key"),
            use_markup: true,
            xalign: .5,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });
        vbox.append(keyLabel);

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path+'/icons/keyboard-symbolic.svg', 256, 72);
        let keyboardImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        keyboardImage.hexpand = true;
        keyboardImage.vexpand = true;
        keyboardImage.halign = Gtk.Align.CENTER;
        keyboardImage.valign = Gtk.Align.CENTER;
        vbox.append(keyboardImage)

        let resultsRow = new Adw.ActionRow({
            title: _("New Hotkey")
        });
        let resultsWidget = new Gtk.ShortcutsShortcut({
            hexpand: true,
            halign: Gtk.Align.END
        });
        resultsRow.add_suffix(resultsWidget);
        keyFrame.add(resultsRow);

        let applyButton = new Gtk.Button({
            label: _("Apply"),
            halign: Gtk.Align.END,
            css_classes: ['suggested-action']
        });
        applyButton.connect('clicked', () => {
            this.emit("response", Gtk.ResponseType.APPLY);
        });
        applyButton.set_sensitive(false);

        this.keyEventController.connect('key-released', (controller, keyval, keycode, state) =>  {
            this.resultsText = "";
            let key = keyval;
            hotkeyKey = Gtk.accelerator_name(key, 0);
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += Gtk.accelerator_name(key,0);
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });

        vbox.append(keyFrame);
        vbox.append(applyButton);
    }
});
