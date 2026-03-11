import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: '彩虹桥 Bifrost',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'favicon.png',
    32: 'favicon.png',
    48: 'favicon.png',
    128: 'favicon.png',
  },
  background: {
    service_worker: 'src/service.ts',
    type: 'module',
  },
  options_ui: {
    page: 'index.html',
    open_in_tab: true,
  },
  action: {
    default_icon: {
      16: 'favicon.png',
      32: 'favicon.png',
      48: 'favicon.png',
      128: 'favicon.png',
    },
  },
  permissions: ['sidePanel', 'contentSettings', 'storage', 'cookies', 'declarativeNetRequest'],
  host_permissions: ['<all_urls>'],
  content_scripts: [
    {
      js: ['src/content.ts'],
      matches: ['https://*/*'],
    },
  ],
})
