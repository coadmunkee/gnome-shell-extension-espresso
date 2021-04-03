// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
// Adapted from auto-move-windows@gnome-shell-extensions.gcampax.github.com

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain('gnome-shell-extension-espresso');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const INHIBIT_APPS_KEY = 'inhibit-apps';
const SHOW_INDICATOR_KEY = 'show-indicator';
const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
const FULLSCREEN_KEY = 'enable-fullscreen';
const RESTORE_KEY = 'restore-state';
const NIGHT_LIGHT_KEY = 'control-nightlight';
const NIGHT_LIGHT_APP_ONLY_KEY = 'control-nightlight-for-app';

const Columns = {
    APPINFO: 0,
    DISPLAY_NAME: 1,
    ICON: 2
};

let MajorShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[0]);
let ShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[1]);

class EspressoWidget {
    constructor(params) {
        this.w = new Gtk.Grid(params);
        this.w.set_orientation(Gtk.Orientation.VERTICAL);

        this._settings = Convenience.getSettings();
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

        this._store = new Gtk.ListStore();
        this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);

        this._treeView = new Gtk.TreeView({ model: this._store,
                                            hexpand: true, vexpand: true });
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

        this.w.attach(this._treeView, 0, 6, 1, 1);

        const toolbar = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 0});

        const newButton = new Gtk.Button( { icon_name : 'list-add-symbolic' });
        log('Add button created.');
        newButton.connect('clicked', this._createNew.bind(this));
        log('Add button connected.');
        toolbar.prepend(newButton);

        const delButton = new Gtk.Button( { icon_name : 'list-remove-symbolic' });
        delButton.connect('clicked', this._deleteSelected.bind(this));
        toolbar.append(delButton);

        this.w.attach(toolbar, 0, 7, 1, 1);

        this._changedPermitted = true;
        this._refresh();
    }

    _createNew() {
        log('createNew called');

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
                modal: true,
            });
    
            this._settings = ExtensionUtils.getSettings();
    
            this.get_widget().set({
                show_all: true,
                show_other: true, // hide more button
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
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    const widget = new EspressoWidget();
    return widget.w;
}
