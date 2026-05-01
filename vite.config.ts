import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import solid from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config'
import pkg from './package.json'

const packageName = pkg.name.split('/').at(-1) ?? 'extension'
const extensionSlug = packageName.replace(/^senators-/, '').replace(/-crx$/, '') || packageName

export default defineConfig({
  plugins: [
    unocss(),
    solid(),
    crx({ manifest }),
    zip({
      inDir: `out/${pkg.version}`,
      outDir: 'out',
      outFileName: `${extensionSlug}-${pkg.version}.zip`,
    }),
  ],
  build: {
    outDir: `out/${pkg.version}`,
    target: 'esnext',
    rolldownOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: 'assets/[ext]/[name].[hash].[ext]',
      },
    },
  },
  server: {
    host: 'localhost',
    cors: {
      origin: /^chrome-extension:\/\/[a-z]{32}$/,
    },
    hmr: {
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
  },
  optimizeDeps: {
    exclude: ['@arwes/solid', '@arwes/solid-animator'],
  },
  resolve: {
    tsconfigPaths: true,
  },
})
