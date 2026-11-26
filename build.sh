#!/bin/bash
# Assembles index.html from src/. Edit the PROJECTS list at the top of src/head.html.
cd "$(dirname "$0")"
{
  cat src/head.html
  echo '<script type="module">'
  cat src/js1.js src/js2.js src/roof.js src/hidden.js src/gallery.js src/cat.js src/cliffs.js src/js3.js
  echo '</script>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
