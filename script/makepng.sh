#!/bin/sh

DIR=$1
FILE=$2

cd $DIR
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
pdftoppm -r 600 -singlefile "$FILE.pdf" "$FILE" >/dev/null 2>&1
convert "$FILE.ppm" -scale 20% -quality 100 "$FILE.png" 2>/dev/null
rm -f "$FILE.tex" "$FILE.pdf" "$FILE.aux" "$FILE.log" "$FILE.ppm" missfont.log >/dev/null 2>&1
