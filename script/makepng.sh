#!/bin/sh

DIR=$1
FILE=$2

cd $DIR
latex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
latex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
dvips -E -x 1500 -o "$FILE.eps" "$FILE.dvi" >/dev/null 2>&1
gs -dSAFER -dBATCH -dNOPAUSE -dEPSCrop -dDOINTERPOLATE -dTextAlphaBits=4 -dGraphicsAlphaBits=4 \
    -sDEVICE=pnggray -sOutputFile="$FILE.png" "$FILE.eps" >/dev/null 2>&1
rm -f "$FILE.tex" "$FILE.dvi" "$FILE.eps" "$FILE.aux" "$FILE.log" >/dev/null 2>&1
