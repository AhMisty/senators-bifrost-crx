<div align="center">
  <h1>Bifrost CRX</h1>
  <img src="../../public/favicon.svg" width="24%" alt="Bifrost CRX logo" />

[![npm version](https://img.shields.io/npm/v/%40senators%2Fbifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](../../LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/%40senators%2Fbifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)

<span style="color: #999">English</span> | [中文](../zh-CN/README.md)

</div>

> A browser extension project for Bifrost, built on the Chrome extension runtime and preconfigured for the `*.lstyxl.com` environment.

## Features

- Manifest V3 extension architecture powered by Vite, SolidJS, CRXJS, and UnoCSS.
- Chrome-specific `ChromeCourier` integration that adapts `fetch`, cookies, redirects, and request headers for `@senators/bifrost`.
- Built-in extension entry points for the service worker, content script, options page, and side panel.
- SPA fallback handling for internal extension navigation through the service worker.
- Versioned build output in `out/<version>` together with a packaged `zip` artifact for distribution.

## Project Structure

```text
.
+-- public/                  Static extension assets
+-- src/content/             Content scripts injected into the target site
+-- src/service/             Background service worker and Chrome runtime integration
+-- src/shared/              Shared route definitions and cross-entry constants
+-- src/ui/                  SolidJS UI for options and extension-facing pages
+-- manifest.config.ts       Manifest V3 source definition
+-- vite.config.ts           Build, dev server, and zip packaging configuration
```

## How It Fits With `@senators/bifrost`

This repository is the browser-extension shell around the core Bifrost library. The `@senators/bifrost` package provides the game automation primitives, while this project adds Chrome runtime integration, extension UI entry points, packaging, and release artifacts.

## Quick Start

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

This starts the Vite-based development workflow used by the extension pages and CRX integration.

### Build the Extension

```bash
# Using npm
npm run build

# Using yarn
yarn build

# Using pnpm
pnpm build
```

The production build generates:

- `out/<version>/` for unpacked extension loading
- `out/bifrost-<version>.zip` for release distribution

### Load the Built Extension in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the generated `out/<version>` directory.

## Available Scripts

- `npm run dev`: Start the extension development workflow.
- `npm run build`: Run checks and create the production extension package.
- `npm run build-only`: Build without running lint and format first.
- `npm run lint`: Run Oxlint with fixes and type-aware checks.
- `npm run fmt`: Format the repository with Oxfmt.
- `npm run check`: Run both lint and format.
- `npm run preview`: Preview the production bundle.
- `npm run push`: Build and publish the package to npm.

## Configuration Notes

- `manifest.config.ts` defines permissions, host permissions, content scripts, the side panel, and extension metadata.
- `vite.config.ts` controls the versioned output directory, asset naming, dev server settings, and zip packaging.
- The current target domain is configured through `workURL` in `manifest.config.ts`. Update it if you need to point the extension at another Bifrost deployment.

## License

This project is open source under the [MIT License](../../LICENSE).

## Contributing

Issues and Pull Requests are welcome.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## Contact

For questions or suggestions, please open a [GitHub Issue](https://github.com/AhMisty/senators-bifrost-crx/issues).

---

<div align="center">
  <p>Built with Vite, SolidJS, and CRXJS | Copyright 2025 Bifrost Project</p>
</div>
