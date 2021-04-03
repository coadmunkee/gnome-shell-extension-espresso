#!/bin/sh

rm -f espresso@coadmunkee.github.com.zip
glib-compile-schemas --strict --targetdir=espresso@coadmunkee.github.com/schemas/ espresso@coadmunkee.github.com/schemas
cd espresso@coadmunkee.github.com && zip -r ../espresso@coadmunkee.github.com.zip *
