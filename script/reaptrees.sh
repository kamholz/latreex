#!/bin/sh

find "$1/trees" -type f -mmin +1 -exec rm -f {} ';'
