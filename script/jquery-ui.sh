#!/bin/sh

DIR=$1

rm -f public/css/images/*
cp -f $DIR/images/* public/css/images
cp -f $DIR/jquery-ui.min.css public/css
cp -f $DIR/jquery-ui.min.js public/js
