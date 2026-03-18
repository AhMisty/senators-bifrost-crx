import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import solid from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.ts'
import pkg from './package.json'

const devServerHost = 'localhost'
const devHmrPort = 5173
const buildOutputDirectory = 'out'

export default defineConfig({
  plugins: [
    unocss(),
    solid(),
    crx({ manifest }),
    zip({
      inDir: buildOutputDirectory,
      outDir: buildOutputDirectory,
      outFileName: `bifrost-${pkg.version}.zip`,
    }),
  ],
  build: {
    outDir: buildOutputDirectory,
    target: 'esnext',
    rolldownOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
    },
  },
  server: {
    host: devServerHost,
    hmr: {
      host: devServerHost,
      port: devHmrPort,
      clientPort: devHmrPort,
    },
  },
  optimizeDeps: {
    exclude: ['@arwes/solid', '@arwes/solid-animator'],
  },
  resolve: {
    tsconfigPaths: true,
  },
})
