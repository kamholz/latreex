#!/bin/sh

mkdir -p xelatex-emoji-images
rm -f xelatex-emoji-images/*

if [ ! -d emojione ]; then
    git clone https://github.com/Ranks/emojione
fi

for f in emojione/assets/svg/*.svg; do
    filename=$(basename "$f")
    filename="${filename%.*}"
    if `rsvg-convert -f pdf -o "xelatex-emoji-images/$filename.pdf" "$f"`; then
        echo "Converted $f"
    fi
done

cd xelatex-emoji

if [ ! -L tex ]; then
    ln -s . tex
fi
