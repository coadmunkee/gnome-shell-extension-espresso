# Espresso
### An extension that enables controlling conditions to prevent the usual auto suspend and screensaver functions from taking effect.
Espresso disables the usual auto suspend and screensaver funcionality and optionally Night Light. Choose options to show an Espresso icon in the top panel, to enable Espresso when a fullscreen application is running, to restore state across reboots, to provide notifications, to enable Espresso when specific applications are running, or to pause Night Light when Espresso is enabled or only when specific applications are running. Espresso also provides some support for docking stations including options to enable Espresso when charging and/or when docked to external monitors and to allow temporarily overriding the docking support without affecting the stored state. 

Espresso is a fork of the Caffeine extension (https://github.com/eonpatapon/gnome-shell-extension-caffeine) and provides essentially the same functionality. However Espresso only supports Gnome shell 40 and later versions whereas Caffeine supports many prior Gnome shell versions as far back as 3.4

<b>Filled cup</b> = auto suspend and screensaver off. <b>Empty cup</b> = normal auto suspend and screensaver.<br> 
![Screenshot](https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/screenshot.png)

There are several Espresso options that can be configured ... <br>
![Preferences](https://github.com/coadmunkee/gnome-shell-extension-espresso/screenshot-prefs.png)

## Installation from extensions.gnome.org
[<img src="https://github.com/coadmunkee/gnome-shell-extension-espresso/raw/master/ego.png" height="100">](https://extensions.gnome.org/extension/4135/espresso)


For additional installation instructions and more information visit [https://github.com/coadmunkee/gnome-shell-extension-espresso/](https://github.com/coadmunkee/gnome-shell-extension-espresso/).


## Installation from git
Clone the repository:
```
git clone https://github.com/coadmunkee/gnome-shell-extension-espresso.git
```
Enter the cloned directory:
```
cd gnome-shell-extension-espresso
```
<b>Optional!!</b> If you want to try Espresso from a specific branch, use the following command replacing [branch_name] with the desired branch:
```
git switch [branch_name]
```
Create updated locale files:
```
./update-locale.sh
```
Compile the current version of the settings schema:
```
glib-compile-schemas --strict --targetdir=espresso@coadmunkee.github.com/schemas/ espresso@coadmunkee.github.com/schemas
```
Copy the extension files into place:
```
cp -r espresso@coadmunkee.github.com ~/.local/share/gnome-shell/extensions/
```
Restart the shell and then enable the extension.

## Report bugs on this site
[https://github.com/coadmunkee/gnome-shell-extension-espresso/issues](https://github.com/coadmunkee/gnome-shell-extension-espresso/issues)
