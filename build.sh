#!/bin/bash
# Assembles index.html from src/. Edit the PROJECTS list at the top of src/head.html.
cd "$(dirname "$0")"
{
  cat src/head.html
  echo '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>'
  echo '<script type="module">'
  cat src/js1.js src/js2.js src/js3.js
  echo '</script>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
