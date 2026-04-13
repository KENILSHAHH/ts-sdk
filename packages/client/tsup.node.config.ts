/* eslint-disable import/no-default-export */

import { defineConfig } from 'tsup';

export default defineConfig(() => ({
  entry: ['src/node.ts'],
  outDir: 'dist',
  sourcemap: true,
  treeshake: true,
  clean: false,
  tsconfig: 'tsconfig.build.json',
  minify: true,
  dts: true,
  platform: 'node',
  format: ['esm'],
}));
