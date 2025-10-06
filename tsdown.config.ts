import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: './src/medgfx.ts',
  format: 'esm',
  dts: true,
  target: 'es2020',
  platform: 'browser',
})