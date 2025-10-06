import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/medgfx.ts', './src/colortables/index.ts'],
  format: 'esm',
  dts: true,
  target: 'es2020',
  platform: 'browser',
  exports: true,
})