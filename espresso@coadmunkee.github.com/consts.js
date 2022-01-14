'use strict';

// NOTE: only `var` is exported, so use `let` or `const` for private members

// setting keys:
var INHIBIT_APPS_KEY = 'inhibit-apps';
var SHOW_INDICATOR_KEY = 'show-indicator';
var SHOW_NOTIFICATIONS_KEY = 'show-notifications';
var USER_ENABLED_KEY = 'user-enabled';
var FULLSCREEN_KEY = 'enable-fullscreen';
var DOCKED_KEY = 'enable-docked';
var CHARGING_KEY = 'enable-charging';
var OVERRIDE_KEY = 'allow-override';
var RESTORE_KEY = 'restore-state';
var NIGHT_LIGHT_KEY = 'control-nightlight';
var NIGHT_LIGHT_APP_ONLY_KEY = 'control-nightlight-for-app';

// virtual apps:
var FULLSCREEN_SYMBOL = Symbol('espresso/fullscreen').toString();
var DOCKED_SYMBOL = Symbol('espresso/docked').toString();
var CHARGING_SYMBOL = Symbol('espresso/charging').toString();
var USER_SYMBOL = Symbol('espresso/user').toString();

// notification states:
var NOTIFY = {
    ENABLED: Symbol("espresso/notifyState/enabled"),
    DISABLED: Symbol("espresso/notifyState/disabled"),
    DOCKED_OFF: Symbol("espresso/notifyState/dockedOff"),
    CHARGING_OFF: Symbol("espresso/notifyState/chargingOff"),
    FULLSCREEN_OFF: Symbol("espresso/notifyState/fullscreenOff"),
};
