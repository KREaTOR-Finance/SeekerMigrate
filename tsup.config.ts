import { defineConfig } from 'tsup';

// Single config with named entries to avoid output filename collisions.
export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
    'seeker-sdk': 'src/seeker-sdk/index.ts',
    telegram: 'src/server/telegram/index.ts',
  },
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  target: 'node18',
  shims: true,
});
