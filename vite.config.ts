import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import pkg from './package.json'

export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  plugins: [
    solid(),
    crx({ manifest }),
    zip({ inDir: 'out', outDir: 'out', outFileName: `bifrost-${pkg.version}.zip` }),
  ],
  build: {
    outDir: 'out',
    target: 'esnext',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
    },
  },
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
