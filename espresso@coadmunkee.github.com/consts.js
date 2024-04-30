'use strict';

// NOTE: only `var` is exported, so use `let` or `const` for private members

// setting keys:
export const INHIBIT_APPS_KEY = 'inhibit-apps';
export const SHOW_INDICATOR_KEY = 'show-indicator';
export const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
export const USER_ENABLED_KEY = 'user-enabled';
export const FULLSCREEN_KEY = 'enable-fullscreen';
export const DOCKED_KEY = 'enable-docked';
export const CHARGING_KEY = 'enable-charging';
export const OVERRIDE_KEY = 'allow-override';
export const RESTORE_KEY = 'restore-state';
export const NIGHT_LIGHT_KEY = 'control-nightlight';
export const NIGHT_LIGHT_APP_ONLY_KEY = 'control-nightlight-for-app';
export const HAS_BATTERY_KEY = 'has-battery';

// virtual apps:
export const FULLSCREEN_SYMBOL = Symbol('espresso/fullscreen').toString();
export const DOCKED_SYMBOL = Symbol('espresso/docked').toString();
export const CHARGING_SYMBOL = Symbol('espresso/charging').toString();
export const USER_SYMBOL = Symbol('espresso/user').toString();

// logging debug and error message control:
export const ESPRESSO_DEBUG_MSG = "Debug";
export const ESPRESSO_ERROR_MSG = "Error";
// set to true to enable logging debug messages to the journal 
// - choose wisely as debug messages are quite verbose
export const ESPRESSO_ENABLE_DEBUG = false;

// notification states:
export const NOTIFY = {
    ENABLED: Symbol("espresso/notifyState/enabled").toString(),
    DISABLED: Symbol("espresso/notifyState/disabled").toString(),
    DOCKED_OFF: Symbol("espresso/notifyState/dockedOff").toString(),
    CHARGING_OFF: Symbol("espresso/notifyState/chargingOff").toString(),
    FULLSCREEN_OFF: Symbol("espresso/notifyState/fullscreenOff").toString(),
};
