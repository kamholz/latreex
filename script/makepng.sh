#!/bin/sh

DIR=$1
FILE=$2

cd $DIR
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
gs -dSAFER -dBATCH -dNOPAUSE -dDOINTERPOLATE -dTextAlphaBits=4 -dGraphicsAlphaBits=4 \
    -r600 -sDEVICE=pnggray -sOutputFile="$FILE.png" "$FILE.pdf" >/dev/null 2>&1
rm -f "$FILE.tex" "$FILE.pdf" "$FILE.aux" "$FILE.log" missfont.log >/dev/null 2>&1
