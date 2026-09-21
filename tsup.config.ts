import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'resources/js/index.ts',
    alpine: 'resources/js/alpine.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  treeshake: true,
  target: 'es2022',
  external: ['alpinejs'],
})
