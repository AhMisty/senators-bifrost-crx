<div align="center">
  <h1>Bifrost CRX</h1>
  <img src="https://github.com/AhMisty/senators-bifrost-crx/blob/main/logo.svg?raw=true" width="30%"/>
  
  [![npm version](https://img.shields.io/npm/v/@senators/bifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost-crx/blob/main/LICENSE)
  [![npm downloads](https://img.shields.io/npm/dm/@senators/bifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
  
  <span style="color: #999">English</span> | [中文](https://github.com/AhMisty/senators-bifrost-crx/blob/main/docs/zh-CN/README.md)
</div>

> 🚀 A browser extension for Bifrost, bringing account, connection, cookie, and request-rule workflows into the Chrome extension runtime.

## ✨ Features

- 🛰️ Integrates the `@senators/bifrost` core library into a Chrome MV3 extension
- 🔒 Adapts fetch, cookies, redirects, and request headers for the extension runtime
- 🚀 Ships with service worker, options page, side panel, and SPA fallback entry points
- 🧭 Configures game address, proxy-address mode, and origin address from the options page
- 🪐 Manages Bifrost accounts from the side panel, including add, edit, delete, and use actions
- 🎲 Generates random IPv4 values for account request identity setup
- 🍪 Syncs active account Token, cookies, and dynamic DNR rules with Chrome APIs
- 🏗️ Generates versioned unpacked builds and zipped release artifacts
- 🛠️ Keeps manifest, build config, service logic, shared state, and UI modules separated
- ⚡ Includes development, lint, format, type-check-friendly, and production packaging scripts

## 🚀 Quick Start

### Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### Start Development

```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using pnpm
pnpm dev
```

This starts the Vite development workflow used by the extension pages and CRX integration.

### Build Extension

```bash
# Using npm
npm run build

# Using yarn
yarn build

# Using pnpm
pnpm build
```

The development output is generated in `out/dev`. The production output is generated in `out/build` and packed as `out/bifrost-<version>.zip`.

### Load Extension

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `out/dev` for development, or `out/build` for production checks

## 🧭 Usage

1. Open the options page and configure the game address
2. Enable proxy-address mode only when the configured game address is a proxy, then fill the origin address
3. Click the extension action icon to open the side panel
4. Add an account with universe, username, password, IP, and Token
5. Click `Use` to activate the account and let the extension sync cookies and request rules

## 🛠️ Development Guide

### Build Project

```bash
# Build project only
npm run build-only

# Build with checks
npm run build
```

### Code Standards

```bash
# Check code standards
npm run lint

# Format code
npm run fmt
```

## 📜 License

This project is open source under the [MIT License](https://github.com/AhMisty/senators-bifrost-crx/blob/main/LICENSE). You are free to use, modify, and distribute the code.

## 🙏 Acknowledgments

- [Bifrost](https://www.npmjs.com/package/@senators/bifrost) - The core automation library used by this extension
- [OGame](https://ogame.gameforge.com) - A fascinating space strategy game
- All contributors - Thank you for your valuable contributions

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📮 Contact

For questions or suggestions, please submit a [GitHub Issue](https://github.com/AhMisty/senators-bifrost-crx/issues).

---

<div align="center">
  <p>Built with <a href="https://vite.dev">Vite</a> | © 2026 Bifrost Project</p>
</div>
