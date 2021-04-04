# Espresso was derived directly from the Caffeine extension and provides the same functionality.
# It has been updated to work with Gnome 40 _only_

## gnome-shell-extension-espresso

Fill the cup to inhibit auto suspend and screensaver.

This extension supports the following versions of Gnome shell:
    40.1
    40.0
    40 - (for pre-release testing)

Filled cup = auto suspend and screensaver off.
![Screenshot - Espresso On](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot-on.png)

Empty cup = normal auto suspend and screensaver. 
![Screenshot - Espresso Off](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot-off.png)

There are several Espresso options that can be configured ... 
![Preferences](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot-prefs.png)


## Installation from extensions.gnome.org
https://extensions.gnome.org/extension/4135/espresso/


## Installation from git
    git clone git://github.com/coadmunkee/gnome-shell-extension-espresso.git
    cd gnome-shell-extension-espresso
    ./update-locale.sh
    glib-compile-schemas --strict --targetdir=espresso@coadmunkee.github.com/schemas/ espresso@coadmunkee.github.com/schemas
    cp -r espresso@coadmunkee.github.com ~/.local/share/gnome-shell/extensions

Restart the shell and then enable the extension.
