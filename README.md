# QuickUI-Design

**QuickUI-Design** is a **Unreal Engine 5 (UE5)** UI design toolkit that leverages **React** to build interactive interfaces for UE5.

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

> `ue-connect` is a local dependency located in the `ue-connect/` directory and will be linked automatically during installation.

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

### Current Entry Point

The active entry is `src/pages/route-template/pages/index.tsx` (configured in `rspack.config.js`). It uses `createMemoryRouter` instead of a browser router — navigation is managed entirely within the UE5 Web View since there is no URL bar.

---

## UE5 Integration

Install the **QuickUI Plugin** in your UE5 project

- **QuickUI Plugin on Fab.com**: [https://fab.com/s/62c93f04e12e](https://fab.com/s/62c93f04e12e)


>For more API documentation, refer to the rule files under the [skills/quickuiapi/](./skills/quickuiapi/) directory.


## License

**Proprietary License - All Rights Reserved**

This software is licensed to authorized users only. Redistribution, resale, or public sharing of the source code is prohibited without permission.

See the [LICENSE](./LICENSE) file for details.

---

## Contact

- **Author**: MarcoTin
- **Email**: 277924771@qq.com
- **Homepage**: [https://quickui.pixelbear.xyz](https://quickui.pixelbear.xyz)
