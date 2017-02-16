#!/bin/sh

find "$1" -type f -mmin +1 ! -exec sh -c 'lsof -- {} >/dev/null 2>&1' ';' -exec rm -f {} ';'
