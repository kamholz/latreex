#!/bin/sh

DIR=$1
FILE=$2
EMOJI=$3

if [ $EMOJI -eq 1 ]; then
    export TEXMFHOME="$4/xelatex-emoji"
fi

cd $DIR
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
pdftoppm -r 600 -singlefile "$FILE.pdf" "$FILE" >/dev/null 2>&1
convert "$FILE.ppm" -scale 25% -quality 100 "$FILE.png" >/dev/null 2>&1
rm -f "$FILE.tex" "$FILE.pdf" "$FILE.aux" "$FILE.log" "$FILE.ppm" missfont.log >/dev/null 2>&1
