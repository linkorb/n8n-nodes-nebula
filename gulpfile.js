const { src, dest, parallel } = require('gulp');

function buildNodeIcons() {
  // Copy icons (png, svg) and codex files (json) to dist/nodes
  return src('nodes/**/*.{png,svg,json}').pipe(dest('dist/nodes'));
}

function buildCredentialIcons() {
  // Copy credential icons (png, svg) to dist/credentials
  return src('credentials/**/*.{png,svg}').pipe(dest('dist/credentials'));
}

exports['build:icons'] = parallel(buildNodeIcons, buildCredentialIcons);
