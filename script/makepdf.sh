#!/bin/sh

DIR=$1
FILE=$2

cd $DIR
latex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
latex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
dvips -E -o "$FILE.eps" "$FILE.dvi" >/dev/null 2>&1
ps2pdf -dEPSCrop "$FILE.eps" "$FILE.pdf" >/dev/null 2>&1
rm -f "$FILE.tex" "$FILE.dvi" "$FILE.eps" "$FILE.aux" "$FILE.log" >/dev/null 2>&1
