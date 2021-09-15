#!/usr/bin/env sh

#assumes source po files are in cd espresso@coadmunkee.github.com

pot=espresso@coadmunkee.github.com/gnome-shell-extension-espresso.pot

touch $pot
xgettext -j espresso@coadmunkee.github.com/*.js -o $pot
xgettext -j espresso@coadmunkee.github.com/schemas/*.xml -o $pot

for locale_lang in locale/*; do
    po=$locale_lang/gnome-shell-extension-espresso.po
    mkdir -p espresso@coadmunkee.github.com/$locale_lang/LC_MESSAGES
    mo=espresso@coadmunkee.github.com/$locale_lang/LC_MESSAGES/gnome-shell-extension-espresso.mo
    echo $po
    msgmerge --backup=off -U $po $pot
    msgfmt $po -o ${mo}
done

rm $pot
