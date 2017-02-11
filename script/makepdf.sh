#!/bin/sh

DIR=$1
FILE=$2

cd $DIR
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
xelatex -interaction batchmode "$FILE.tex" >/dev/null 2>&1
#rm -f "$FILE.tex" "$FILE.aux" "$FILE.log" missfont.log >/dev/null 2>&1
