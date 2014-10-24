#!/bin/sh

find "$1" -type f -mmin +1 -exec rm -f {} ';'
