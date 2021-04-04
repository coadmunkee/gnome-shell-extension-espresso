# Espresso was derived directly from the Caffeine extension and provides the same functionality.
# It has been updated to work with Gnome 40 _only_

## gnome-shell-extension-espresso

Fill the cup to inhibit auto suspend and screensaver.

This extension supports gnome-shell 40:

    * master: 40

![Screenshot](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot.png)

![Preferences](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot-prefs.png)

Empty cup = normal auto suspend and screensaver. Filled cup = auto suspend and
screensaver off.

## Installation from e.g.o

https://extensions.gnome.org/extension/4135/espresso/

## Installation from git

    git clone git://github.com/coadmunkee/gnome-shell-extension-espresso.git
    cd gnome-shell-extension-espresso
    ./update-locale.sh
    glib-compile-schemas --strict --targetdir=espresso@coadmunkee.github.com/schemas/ espresso@coadmunkee.github.com/schemas
    cp -r espresso@coadmunkee.github.com ~/.local/share/gnome-shell/extensions

Restart the shell and then enable the extension.
