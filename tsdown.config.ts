import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'resources/js/index.ts',
    alpine: 'resources/js/alpine.ts',
    widget: 'resources/js/widget.ts',
  },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  minify: false,
})
