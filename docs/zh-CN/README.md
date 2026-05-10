<div align="center">
  <h1>Bifrost CRX 浏览器扩展</h1>
  <img src="https://github.com/AhMisty/senators-bifrost-crx/blob/main/logo.svg?raw=true" width="30%"/>
  
  [![npm 版本](https://img.shields.io/npm/v/@senators/bifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
  [![许可证：MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost-crx/blob/main/LICENSE)
  [![npm 下载量](https://img.shields.io/npm/dm/@senators/bifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
  
  [English](https://github.com/AhMisty/senators-bifrost-crx/blob/main/docs/en-US/README.md) | <span style="color: #999">中文</span>
</div>

> 🚀 一个面向 Bifrost 的浏览器扩展项目，把核心自动化能力接入 Chrome 扩展运行时。

## ✨ 功能特性

- 🛰️ 将 `@senators/bifrost` 核心库集成到 Chrome 扩展工程中
- 🔒 为浏览器扩展环境适配请求、Cookie 与重定向处理
- 🚀 内置 service worker、options page 和 side panel 等扩展入口
- 🪐 使用 SolidJS 与 UnoCSS 构建扩展界面
- 🏗️ 自动生成按版本区分的解压产物与 zip 发布包
- 🛠️ 将 manifest、构建配置与运行时集成解耦，便于维护和扩展
- ⚡ 内置开发、检查、格式化与生产打包脚本
- 📡 默认面向已配置的 `*.lstyxl.com` Bifrost 部署环境

## 🚀 快速开始

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

### 启动开发

```bash
# 使用 npm
npm run dev

# 使用 yarn
yarn dev

# 使用 pnpm
pnpm dev
```

这会启动基于 Vite 的开发流程，用于扩展页面和 CRX 集成的本地开发。

### 构建扩展

```bash
# 使用 npm
npm run build

# 使用 yarn
yarn build

# 使用 pnpm
pnpm build
```

开发产物会输出到 `out/dev`。生产构建产物会输出到 `out/build`，并同时打包为 `out/bifrost-<version>.zip`。

### 加载扩展

1. 打开 `chrome://extensions`
2. 开启 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 开发时选择 `out/dev`，生产检查时选择 `out/build`

## 🛠️ 开发指南

### 构建项目

```bash
# 仅构建项目
npm run build-only

# 带检查构建
npm run build
```

### 代码规范

```bash
# 检查代码规范
npm run lint

# 格式化代码
npm run fmt
```

## 📜 许可证

本项目基于 [MIT License](https://github.com/AhMisty/senators-bifrost-crx/blob/main/LICENSE) 开源，你可以自由使用、修改和分发本项目代码。

## 🙏 致谢

- [Bifrost](https://www.npmjs.com/package/@senators/bifrost) - 当前扩展所依赖的核心自动化库
- [OGame](https://ogame.gameforge.com) - 一个令人着迷的太空策略游戏
- 所有贡献者 - 感谢你们的宝贵贡献

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交修改（`git commit -m 'Add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 打开 Pull Request

## 📮 联系方式

如果你有问题或建议，欢迎通过 [GitHub Issues](https://github.com/AhMisty/senators-bifrost-crx/issues) 提交。

---

<div align="center">
  <p>Built with <a href="https://vite.dev">Vite</a> | © 2026 Bifrost Project</p>
</div>
