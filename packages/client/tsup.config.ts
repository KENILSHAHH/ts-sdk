/* eslint-disable import/no-default-export */

import { defineConfig } from 'tsup';

export default defineConfig(() => [
  {
    entry: [
      'src/index.ts',
      'src/actions/index.ts',
      'src/decorators/index.ts',
      'src/viem/index.ts',
    ],
    outDir: 'dist',
    sourcemap: true,
    treeshake: true,
    clean: true,
    tsconfig: 'tsconfig.build.json',
    bundle: true,
    minify: true,
    dts: true,
    platform: 'neutral',
    format: ['esm'],
  },
  {
    entry: ['src/node.ts'],
    outDir: 'dist',
    sourcemap: true,
    treeshake: true,
    clean: true,
    tsconfig: 'tsconfig.build.json',
    minify: true,
    dts: true,
    platform: 'node',
    format: ['esm'],
  },
]);
