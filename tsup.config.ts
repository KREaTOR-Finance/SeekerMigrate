import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    shims: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
    shims: true,
  },
  {
    entry: ['src/server/telegram/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
    shims: true,
  },
]);
