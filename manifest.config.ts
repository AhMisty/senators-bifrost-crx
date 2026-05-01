import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const iconFile = 'favicon.png'
const extensionIcons = {
  16: iconFile,
  32: iconFile,
  48: iconFile,
  128: iconFile,
} as const
const workURL = '*://*/*'
const packageName = pkg.name.split('/').at(-1) ?? ''
const extensionSlug = packageName.replace(/^senators-/, '').replace(/-crx$/, '')
const extensionName = extensionSlug
  .split('-')
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(' ')

export default defineManifest({
  manifest_version: 3,
  name: extensionName,
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
  permissions: ['sidePanel', 'storage', 'cookies', 'declarativeNetRequest'],
  host_permissions: [workURL],
})
