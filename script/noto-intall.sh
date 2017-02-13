#!/bin/sh

rm -rf noto
rm -rf /usr/local/share/fonts/opentype/noto
rm -rf /usr/local/share/fonts/truetype/noto

mkdir -p noto
mkdir -p /usr/local/share/fonts/opentype/noto
mkdir -p /usr/local/share/fonts/truetype/noto

cd noto
wget https://noto-website-2.storage.googleapis.com/pkgs/Noto-hinted.zip
unzip Noto-hinted.zip
chmod 644 *
mv *.otf /usr/local/share/fonts/opentype/noto
mv *.ttf /usr/local/share/fonts/truetype/noto
cd ..

rm -rf noto
fc-cache -fv
