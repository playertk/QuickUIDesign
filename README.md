# QuickUI-Design

English | [中文](#quickui-design-中文)

**QuickUI-Design** is a **Unreal Engine 5 (UE5)** UI design toolkit that leverages **React** to build interactive interfaces for UE5.

> Online Documentation: [https://uecopilot.pixelbear.xyz/](https://uecopilot.pixelbear.xyz/)

## Features

- ⚡ **React-Driven UI** — Build UE5 interfaces with React 18 + TypeScript for a component-based development experience
- 🔗 **Bidirectional UE5 Communication** — Real-time data exchange between Web ↔ UE5 via the `ue-connect` library
- 🧭 **Routing Architecture** — React Router v7 with `createMemoryRouter` for seamless page navigation inside UE5 Web views (no URL bar needed)
- 🎬 **Page Transition Animations** — Powered by framer-motion v11 with `AnimatePresence` for fluid route transitions
- 📐 **Screen Anchor System** — Nine-position screen anchoring component (`ScreenAnchor` + `AnchorGrid`) for pixel-perfect UI layout
- 🎨 **Tailwind CSS Styling** — Utility-first styling with Tailwind CSS 3.4 for rapid, beautiful UI development
- 🖱️ **Mouse Event Penetration** — Use the `data-nohit` attribute to control mouse event pass-through behavior in UE5
- 🧩 **Type Safety** — Fully TypeScript-powered development with comprehensive type definitions
- 🛠️ **Asset Toolchain** — Built-in utilities for image-to-Base64 conversion, HTML merging, and more
- 🎨 **Visual DOM Editing** — Integrated **ClickDeck** visual editor for in-browser DOM style tweaking, AI Prompt export, and presentation mode

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (or **pnpm** / **yarn**)
- **UE5 Project** (for integration with the QuickUI UE5 Plugin)

## Installation & Usage

### 1. Clone the Project

```bash
git clone https://github.com/playertk/QuickUIDesign.git

cd QuickUIDesign

```

### 2. Install Dependencies

```bash
npm install
```

> `ue-connect` and `clickdeck-core` are local dependencies located in the `ue-connect/` and `clickdeck-core/` directories respectively, and will be linked automatically during installation. `clickdeck-core` requires `react@^18` as a peer dependency.

### 3. Start the Dev Server

```bash
npm run dev
```

The page will open at `http://localhost:3000` by default with hot module replacement (HMR) support.

### 4. Production Build

```bash
npm run build
```

Build artifacts are output to the `dist/` directory. HTML files will be automatically formatted with Prettier after the build.

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Rspack Serve, port 3000) |
| `npm run build` | Production build + Prettier HTML formatting |
| `npm run merge-html` | Merge HTML asset files |
| `npm run base64img` | Convert images under `src/assets/img/` to Base64 |
| `npm run prettier` | Format TS/TSX files in `src/` |
| `npm run lint` | ESLint code checking |
| `npm run format:lint` | ESLint auto-fix |
| `npm run formatfix` | Prettier formatting + ESLint auto-fix |

## Project Structure

```
QuickUIDesign/
├── public/                        # Static assets (HTML template, images, audio)
│   ├── audios/light-on.mp3
│   ├── img/lufei.png
│   └── index.html
├── src/
│   ├── assets/img/                # Image assets & Base64 text files
│   ├── components/
│   │   ├── Ohters/
│   │   │   ├── DemoContent.tsx    # Mouse penetration demo
│   │   │   └── UEConnect-Demo/    # UE5 communication demo
│   │   ├── framer-motion/
│   │   │   ├── animated-layout.tsx    # Motion.div wrapper for page content
│   │   │   └── animated-outlet.tsx    # AnimatePresence-wrapped Outlet
│   │   └── screen-anchor/
│   │       └── index.tsx          # 9-position screen anchor (AnchorGrid + ScreenAnchor)
│   ├── lib/
│   │   ├── data/
│   │   │   └── animate-data.tsx   # Default framer-motion animation presets
│   │   └── utils.ts               # cn() helper (clsx + tailwind-merge)
│   ├── pages/
│   │   └── route-template/        # ★ Active entry (React Router v7)
│   │       ├── pages/
│   │       │   ├── index.tsx      # App entry (MemoryRouter + UEProvider)
│   │       │   ├── layout.tsx     # Root layout (autofit.js, AnimatedOutlet)
│   │       │   ├── error-page.tsx # Route error boundary
│   │       │   ├── home/          # Home page (ScreenAnchor demo)
│   │       │   └── show/          # Show/detail page (image loading demo)
│   │       └── router/
│   │           └── index.tsx      # Route definitions
│   ├── styles/
│   │   └── index.css              # Tailwind CSS directives
│   └── types/
│       └── @type.d.ts             # Type declarations
├── ue-connect/                    # UE5 ↔ Web bridging library (local dependency)
├── clickdeck-core/                # ClickDeck visual editor core module (local dependency, MIT)
│                                  # 🔗 https://github.com/ningsiii/ClickDeck
├── assets-tool/                   # Asset processing utility scripts
│   ├── convertImageToBase64.js
│   └── merge-html.js
├── docs/template/                 # Template documentation (index.mdx)
├── skills/quickuiapi/             # Qoder skill: QuickUI API development assistant
├── rspack.config.js               # Rspack build configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json
└── .babelrc / .eslintrc.json / .prettierrc.js
```

### Path Aliases

| Alias | Mapped Path |
|-------|-------------|
| `@` | `./src/` |
| `ue-connect` | `./ue-connect/` |
| `clickdeck-core` | `./clickdeck-core/` |

### Current Entry Point

The active entry is `src/pages/route-template/pages/index.tsx` (configured in `rspack.config.js`). It uses `createMemoryRouter` instead of a browser router — navigation is managed entirely within the UE5 Web View since there is no URL bar.

---

## UE5 Integration

Install the **QuickUI Plugin** in your UE5 project

- **QuickUI Plugin on Fab.com**: [https://fab.com/s/62c93f04e12e](https://fab.com/s/62c93f04e12e)


>For more API documentation, refer to the rule files under the [skills/quickuiapi/](./skills/quickuiapi/) directory.

## Acknowledgments

- Special thanks to **[ClickDeck](https://github.com/ningsiii/ClickDeck)** for providing this excellent open-source project. Integrated as a local dependency `clickdeck-core`, it offers in-browser style editing, AI Prompt export, and presentation mode features.

## License

This project includes both open-source and proprietary components. See the [LICENSE](./LICENSE) file for details.

- **ClickDeck** — MIT License (Copyright (c) 2026 ClickDeck contributors)
- **QuickUIDesign (proprietary code)** — Commercial License (Copyright (c) 2026 MarcoTin. All Rights Reserved.)

---

## Contact

- **Author**: MarcoTin
- **Email**: 277924771@qq.com
- **Homepage**: [https://quickui.pixelbear.xyz](https://quickui.pixelbear.xyz)


---

# QuickUI-Design 中文

**QuickUI-Design** 是一个 **Unreal Engine 5 (UE5)** UI 设计工具包，利用 **React** 为 UE5 构建交互式界面。

> 在线文档：[https://uecopilot.pixelbear.xyz/](https://uecopilot.pixelbear.xyz/)

## 特性

- ⚡ **React 驱动 UI** — 使用 React 18 + TypeScript 构建 UE5 界面，获得基于组件的开发体验
- 🔗 **UE5 双向通信** — 通过 `ue-connect` 库实现 Web ↔ UE5 之间的实时数据交换
- 🧭 **路由架构** — React Router v7 配合 `createMemoryRouter`，在 UE5 Web 视图中实现无缝页面导航（无需 URL 地址栏）
- 🎬 **页面过渡动画** — 基于 framer-motion v11 的 `AnimatePresence` 实现流畅的路由切换动画
- 📐 **屏幕锚定系统** — 九宫格屏幕锚定组件（`ScreenAnchor` + `AnchorGrid`），实现像素级的精确 UI 布局
- 🎨 **Tailwind CSS 样式** — 使用 Tailwind CSS 3.4 进行实用优先的样式设计，快速构建美观的 UI
- 🖱️ **鼠标事件穿透** — 使用 `data-nohit` 属性控制鼠标事件在 UE5 中的穿透行为
- 🧩 **类型安全** — 全 TypeScript 开发，配备完善的类型定义
- 🛠️ **资源工具链** — 内置图片转 Base64、HTML 合并等实用工具
- 🎨 **可视化 DOM 编辑** — 集成 **ClickDeck** 可视化编辑器，支持浏览器内 DOM 样式调整、AI Prompt 导出和演示模式

## 前置要求

- **Node.js** >= 18.x
- **npm** >= 9.x（或 **pnpm** / **yarn**）
- **UE5 项目**（用于集成 QuickUI UE5 插件）

## 安装与使用

### 1. 克隆项目

```bash
git clone https://github.com/playertk/QuickUIDesign.git

cd QuickUIDesign
```

### 2. 安装依赖

```bash
npm install
```

> `ue-connect` 和 `clickdeck-core` 是分别位于 `ue-connect/` 和 `clickdeck-core/` 目录下的本地依赖，安装过程中会自动链接。`clickdeck-core` 需要 `react@^18` 作为 peer 依赖。

### 3. 启动开发服务器

```bash
npm run dev
```

默认情况下页面将在 `http://localhost:3000` 打开，并支持热模块替换（HMR）。

### 4. 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。构建完成后 HTML 文件将自动通过 Prettier 格式化。

## NPM 脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器（Rspack Serve，端口 3000） |
| `npm run build` | 生产构建 + Prettier HTML 格式化 |
| `npm run merge-html` | 合并 HTML 资源文件 |
| `npm run base64img` | 将 `src/assets/img/` 下的图片转换为 Base64 |
| `npm run prettier` | 格式化 `src/` 下的 TS/TSX 文件 |
| `npm run lint` | ESLint 代码检查 |
| `npm run format:lint` | ESLint 自动修复 |
| `npm run formatfix` | Prettier 格式化 + ESLint 自动修复 |

## 项目结构

```
QuickUIDesign/
├── public/                        # 静态资源（HTML 模板、图片、音频）
│   ├── audios/light-on.mp3
│   ├── img/lufei.png
│   └── index.html
├── src/
│   ├── assets/img/                # 图片资源及 Base64 文本文件
│   ├── components/
│   │   ├── Ohters/
│   │   │   ├── DemoContent.tsx    # 鼠标穿透演示
│   │   │   └── UEConnect-Demo/    # UE5 通信演示
│   │   ├── framer-motion/
│   │   │   ├── animated-layout.tsx    # 页面内容的 Motion.div 包装
│   │   │   └── animated-outlet.tsx    # 基于 AnimatePresence 的 Outlet 包装
│   │   └── screen-anchor/
│   │       └── index.tsx          # 九宫格屏幕锚定（AnchorGrid + ScreenAnchor）
│   ├── lib/
│   │   ├── data/
│   │   │   └── animate-data.tsx   # 默认 framer-motion 动画预设
│   │   └── utils.ts               # cn() 辅助函数（clsx + tailwind-merge）
│   ├── pages/
│   │   └── route-template/        # ★ 当前活动入口（React Router v7）
│   │       ├── pages/
│   │       │   ├── index.tsx      # 应用入口（MemoryRouter + UEProvider）
│   │       │   ├── layout.tsx     # 根布局（autofit.js, AnimatedOutlet）
│   │       │   ├── error-page.tsx # 路由错误边界
│   │       │   ├── home/          # 首页（ScreenAnchor 演示）
│   │       │   └── show/          # 展示/详情页（图片加载演示）
│   │       └── router/
│   │           └── index.tsx      # 路由定义
│   ├── styles/
│   │   └── index.css              # Tailwind CSS 指令
│   └── types/
│       └── @type.d.ts             # 类型声明
├── ue-connect/                    # UE5 ↔ Web 桥接库（本地依赖）
├── clickdeck-core/                # ClickDeck 可视化编辑器核心模块（本地依赖，MIT）
│                                  # 🔗 https://github.com/ningsiii/ClickDeck
├── assets-tool/                   # 资源处理工具脚本
│   ├── convertImageToBase64.js
│   └── merge-html.js
├── docs/template/                 # 模板文档（index.mdx）
├── skills/quickuiapi/             # Qoder 技能：QuickUI API 开发助手
├── rspack.config.js               # Rspack 构建配置
├── tailwind.config.js             # Tailwind CSS 配置
├── tsconfig.json                  # TypeScript 配置
├── package.json
└── .babelrc / .eslintrc.json / .prettierrc.js
```

### 路径别名

| 别名 | 映射路径 |
|------|----------|
| `@` | `./src/` |
| `ue-connect` | `./ue-connect/` |
| `clickdeck-core` | `./clickdeck-core/` |

### 当前入口点

当前活动入口为 `src/pages/route-template/pages/index.tsx`（在 `rspack.config.js` 中配置）。它使用 `createMemoryRouter` 而非浏览器路由 —— 由于没有 URL 地址栏，导航完全在 UE5 Web View 内部管理。

---

## UE5 集成

在你的 UE5 项目中安装 **QuickUI 插件**：

- **QuickUI Plugin on Fab.com**：[https://fab.com/s/62c93f04e12e](https://fab.com/s/62c93f04e12e)

> 更多 API 文档请参考 [skills/quickuiapi/](./skills/quickuiapi/) 目录下的规则文件。

## 致谢

- 感谢 **[ClickDeck](https://github.com/ningsiii/ClickDeck)** 感谢提供的优秀开源项目。以 `clickdeck-core` 本地依赖形式集成，提供浏览器内样式编辑、AI Prompt 导出和演示模式功能。

## 许可证

本项目包含开源和专有两部分代码，详见 [LICENSE](./LICENSE) 文件。

- **ClickDeck** — MIT 许可证（Copyright (c) 2026 ClickDeck contributors）
- **QuickUIDesign（自有代码）** — 商业许可证（Copyright (c) 2026 MarcoTin. All Rights Reserved.）

---

## 联系方式

- **作者**：MarcoTin
- **邮箱**：277924771@qq.com
- **主页**：[https://quickui.pixelbear.xyz](https://quickui.pixelbear.xyz)
