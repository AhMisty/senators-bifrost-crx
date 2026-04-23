<div align="center">
  <h1>Bifrost CRX 浏览器扩展</h1>
  <img src="../../public/favicon.svg" width="24%" alt="Bifrost CRX 标志" />

[![npm 版本](https://img.shields.io/npm/v/%40senators%2Fbifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)
[![许可证：MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](../../LICENSE)
[![npm 下载量](https://img.shields.io/npm/dm/%40senators%2Fbifrost-crx.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost-crx)

[English](../en-US/README.md) | <span style="color: #999">中文</span>

</div>

> 这是一个面向 Bifrost 的浏览器扩展项目，运行在 Chrome 扩展环境之上，并默认针对 `*.lstyxl.com` 域名完成了基础配置。

## 特性

- 基于 Manifest V3、Vite、SolidJS、CRXJS 与 UnoCSS 构建的扩展工程架构。
- 提供面向 Chrome 运行时的 `ChromeCourier` 适配层，为 `@senators/bifrost` 补齐 `fetch`、Cookie、重定向和请求头处理能力。
- 内置 service worker、content script、options page 与 side panel 等扩展入口。
- 通过 service worker 为扩展内部页面提供 SPA 导航兜底能力。
- 构建结果按版本输出到 `out/<version>`，同时自动生成可分发的 `zip` 压缩包。

## 项目结构

```text
.
+-- public/                  扩展静态资源
+-- src/content/             注入目标站点的内容脚本
+-- src/service/             后台 service worker 与 Chrome 运行时集成
+-- src/shared/              跨入口共享的路由与常量
+-- src/ui/                  面向 options 等扩展页面的 SolidJS 界面
+-- manifest.config.ts       Manifest V3 源配置
+-- vite.config.ts           构建、开发服务器与 zip 打包配置
```

## 它和 `@senators/bifrost` 的关系

这个仓库负责浏览器扩展这一层壳。`@senators/bifrost` 提供核心的游戏自动化能力，而当前项目补上的是 Chrome 运行时集成、扩展页面入口、构建打包和发布产物。

## 快速开始

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

这会启动基于 Vite 的扩展开发流程，用于扩展页面与 CRX 集成的本地开发。

### 构建扩展

```bash
# 使用 npm
npm run build

# 使用 yarn
yarn build

# 使用 pnpm
pnpm build
```

生产构建会生成以下产物：

- `out/<version>/`：用于浏览器“加载已解压的扩展程序”
- `out/bifrost-<version>.zip`：用于发布分发的压缩包

### 在 Chrome 中加载构建产物

1. 打开 `chrome://extensions`
2. 开启 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 选择生成后的 `out/<version>` 目录

## 可用脚本

- `npm run dev`：启动扩展开发流程。
- `npm run build`：执行检查并生成生产环境扩展包。
- `npm run build-only`：跳过 lint 和格式化，直接构建。
- `npm run lint`：运行带自动修复和类型感知能力的 Oxlint。
- `npm run fmt`：使用 Oxfmt 格式化仓库代码。
- `npm run check`：同时执行 lint 和格式化。
- `npm run preview`：预览生产构建结果。
- `npm run push`：构建后发布 npm 包。

## 配置说明

- `manifest.config.ts` 负责定义权限、host permissions、content scripts、side panel 和扩展元数据。
- `vite.config.ts` 负责控制版本化输出目录、资源命名、开发服务器以及 zip 打包策略。
- 当前目标域名通过 `manifest.config.ts` 中的 `workURL` 配置。如果你要适配其他 Bifrost 部署环境，应当先修改这里。

## 许可证

本项目基于 [MIT License](../../LICENSE) 开源。

## 参与贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库。
2. 创建你的功能分支（`git checkout -b feature/amazing-feature`）。
3. 提交修改（`git commit -m 'Add some amazing feature'`）。
4. 推送到分支（`git push origin feature/amazing-feature`）。
5. 发起 Pull Request。

## 联系方式

如果你有问题或建议，欢迎通过 [GitHub Issue](https://github.com/AhMisty/senators-bifrost-crx/issues) 提交。

---

<div align="center">
  <p>Built with Vite, SolidJS, and CRXJS | Copyright 2025 Bifrost Project</p>
</div>
