#!/bin/bash

# You need to have Graphviz installed to run this script
# On Debian-based systems, you can install it using: sudo apt-get install graphviz

# Make figures from .dot files
for f in *.dot; do
    dot -Tsvg $f -o ${f%.dot}.svg
done
