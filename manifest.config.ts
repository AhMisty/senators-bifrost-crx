import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const iconFile = 'favicon.png'
const extensionIcons = {
  16: iconFile,
  32: iconFile,
  48: iconFile,
  128: iconFile,
} as const
const workURL = '*://*.lstyxl.com/*'

export default defineManifest({
  manifest_version: 3,
  name: 'Bifrost',
  version: pkg.version,
  description: pkg.description,
  icons: extensionIcons,
  background: {
    service_worker: 'src/service/index.ts',
    type: 'module',
  },
  options_ui: {
    page: 'index.html',
    open_in_tab: true,
  },
  action: {
    default_icon: extensionIcons,
  },
  permissions: ['sidePanel', 'contentSettings', 'storage', 'cookies', 'declarativeNetRequest'],
  host_permissions: [workURL],
  content_scripts: [
    {
      js: ['src/content/index.ts'],
      matches: [workURL],
    },
  ],
})
