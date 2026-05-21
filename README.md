# QuickUI-Design

**QuickUI-Design** is a **Unreal Engine 5 (UE5)** UI design toolkit that leverages **React** to build interactive interfaces for UE5. 

## Features

- ⚡ **React-Driven UI** — Build UE5 interfaces with React 18 + TypeScript for a component-based development experience
- 🔗 **Bidirectional UE5 Communication** — Real-time data exchange between Web ↔ UE5 via the `ue-connect` library
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
git clone <your-repo-url>
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
├── public/                    # Static assets (HTML template)
│   └── index.html
├── src/
│   ├── assets/img/            # Image assets & Base64 text files
│   ├── components/            # React components
│   ├── lib/                   # Utility functions
│   ├── pages/template/        # Entry point & App component
│   ├── styles/                # Global styles (CSS)
│   └── types/                 # Type definitions
├── ue-connect/                # UE5 ↔ Web bridging library (local dependency)
├── assets-tool/               # Asset processing utility scripts
│   ├── convertImageToBase64.js
│   └── merge-html.js
├── skills/quickuiapi/         # Qoder skill: QuickUI API development assistant
├── rspack.config.js           # Rspack build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── package.json
└── .babelrc / .eslintrc.json / .prettierrc.js
```

### Path Aliases

| Alias | Mapped Path |
|-------|-------------|
| `@` | `./src/` |
| `ue-connect` | `./ue-connect/` |

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
