# MenuFacil Desktop — Phase 1: Scaffold + Login + PDV

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get a working Tauri desktop app with login and PDV screen connected to the production API.

**Architecture:** Tauri 2 app in `apps/desktop/` using React + Vite frontend. Connects to the existing NestJS API. Shares `packages/shared` for types/enums. No Rust native modules yet (Phase 3) — uses web printing as fallback.

**Tech Stack:** Tauri 2, React 19, Vite 6, TypeScript, Tailwind CSS v4, Redux Toolkit + RTK Query

**Spec:** `docs/superpowers/specs/2026-03-21-desktop-app-design.md`

---

### Task 1: Install Tauri CLI and scaffold the project

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.tsx`
- Modify: `pnpm-workspace.yaml` (add apps/desktop)

- [ ] **Step 1: Install Tauri CLI globally**

```bash
pnpm add -Dw @tauri-apps/cli@^2
```

- [ ] **Step 2: Add desktop to pnpm workspace**

In `pnpm-workspace.yaml`, ensure `apps/desktop` is included:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create apps/desktop directory and init**

```bash
mkdir -p apps/desktop/src apps/desktop/src-tauri/src
```

- [ ] **Step 4: Create package.json**

Create `apps/desktop/package.json`:
```json
{
  "name": "desktop",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-store": "^2",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.7.0",
    "@menufacil/shared": "workspace:*"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.0",
    "vite": "^6.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 5: Create vite.config.ts**

Create `apps/desktop/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    proxy: {
      '/api': {
        target: 'https://menufacil-api.mp1rvc.easypanel.host',
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: 'https://menufacil-api.mp1rvc.easypanel.host',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 6: Create tsconfig.json**

Create `apps/desktop/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "outDir": "dist",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

- [ ] **Step 7: Create Tauri config**

Create `apps/desktop/src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",
  "productName": "MenuFacil",
  "version": "0.1.0",
  "identifier": "com.menufacil.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "title": "MenuFacil",
    "windows": [
      {
        "title": "MenuFacil",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 8: Create Cargo.toml**

Create `apps/desktop/src-tauri/Cargo.toml`:
```toml
[package]
name = "menufacil-desktop"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

- [ ] **Step 9: Create build.rs**

Create `apps/desktop/src-tauri/build.rs`:
```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 10: Create main.rs**

Create `apps/desktop/src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 11: Create index.html**

Create `apps/desktop/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MenuFacil</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 12: Create src/main.tsx**

Create `apps/desktop/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 13: Create src/index.css**

Create `apps/desktop/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-primary: #FF6B35;
  --color-primary-dark: #E55A2B;
  --color-primary-light: #FF8A5C;
}
```

- [ ] **Step 14: Create minimal App.tsx**

Create `apps/desktop/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-primary">MenuFacil Desktop</h1>
    </div>
  );
}
```

- [ ] **Step 15: Install dependencies and verify it runs**

```bash
cd apps/desktop && pnpm install
pnpm tauri:dev
```

Expected: Tauri window opens showing "MenuFacil Desktop"

- [ ] **Step 16: Generate default icons**

```bash
cd apps/desktop && pnpm tauri icon ../../apps/web/public/favicon.ico
```

- [ ] **Step 17: Commit**

```bash
git add apps/desktop pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(desktop): scaffold Tauri 2 app with React + Vite"
```

---

### Task 2: Redux Store + API Client + Auth

**Files:**
- Create: `apps/desktop/src/store/index.ts`
- Create: `apps/desktop/src/store/hooks.ts`
- Create: `apps/desktop/src/store/slices/authSlice.ts`
- Create: `apps/desktop/src/api/baseApi.ts`
- Create: `apps/desktop/src/api/api.ts`
- Create: `apps/desktop/src/utils/cn.ts`
- Create: `apps/desktop/src/utils/formatPrice.ts`

- [ ] **Step 1: Create utility functions**

Create `apps/desktop/src/utils/cn.ts`:
```tsx
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

Create `apps/desktop/src/utils/formatPrice.ts`:
```tsx
export function formatPrice(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}
```

- [ ] **Step 2: Create auth slice**

Create `apps/desktop/src/store/slices/authSlice.ts` — stores user, token, tenantSlug. Login/logout actions. Persists to Tauri store.

- [ ] **Step 3: Create base API with RTK Query**

Create `apps/desktop/src/api/baseApi.ts` — same pattern as web but with tenant slug header injection from auth state.

- [ ] **Step 4: Create API endpoints**

Create `apps/desktop/src/api/api.ts` — endpoints needed for Phase 1: login, getProducts, getCategories, getCustomers, createAdminOrder, getCashRegister, openCashRegister, closeCashRegister, getOrders, getTables, getTenantBySlug.

- [ ] **Step 5: Create store with persist middleware**

Create `apps/desktop/src/store/index.ts` + `hooks.ts`

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src
git commit -m "feat(desktop): Redux store, API client, auth slice"
```

---

### Task 3: Login Screen

**Files:**
- Create: `apps/desktop/src/pages/Login.tsx`
- Modify: `apps/desktop/src/App.tsx` (add router + auth guard)

- [ ] **Step 1: Create Login page**

Full login form with email + password, tenant slug input, "Lembrar-me" checkbox. Styled with primary theme. Saves credentials to Tauri secure store on success.

- [ ] **Step 2: Update App.tsx with router + auth guard**

React Router with routes: `/login`, `/`, `/orders`, `/kds`, `/cash`, `/printer`, `/settings`. Redirect to login if not authenticated.

- [ ] **Step 3: Test login against production API**

```bash
pnpm tauri:dev
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(desktop): login screen with auth persistence"
```

---

### Task 4: Desktop Layout (minimal sidebar)

**Files:**
- Create: `apps/desktop/src/components/DesktopLayout.tsx`

- [ ] **Step 1: Create DesktopLayout**

Minimal left sidebar (collapsed by default, ~60px): icons for PDV, Pedidos, KDS, Caixa, Impressora, Config. Bottom: user avatar + logout. Top: MenuFacil logo.

No group collapsing — flat icon list. Active indicator with primary color bar.

Header bar: tenant name, connection status indicator (green dot = online, red = offline).

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(desktop): minimal sidebar layout"
```

---

### Task 5: PDV Screen

**Files:**
- Create: `apps/desktop/src/pages/PDV.tsx`
- Create: `apps/desktop/src/components/ProductModal.tsx`

- [ ] **Step 1: Create PDV page**

Adapt the POS page from `apps/web/src/pages/admin/POS.tsx` to desktop:
- Same 2-column layout (catalog left, cart right)
- Same product modal with variations/extras/quantity
- Same payment flow (cash with change, PIX QR, card)
- Same cash register integration
- Remove PageHeader (desktop layout provides it)
- Touch-optimized: bigger buttons, larger touch targets

Key difference: uses desktop API client instead of web's adminApi.

- [ ] **Step 2: Create ProductModal component**

Extract the ProductModal from POS into a standalone component (shared between PDV and any future product selection UI).

- [ ] **Step 3: Test PDV flow**

Open app → Login → PDV should show products → Add items → Payment → Finalize order

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(desktop): PDV screen with full POS functionality"
```

---

### Task 6: Orders Screen

**Files:**
- Create: `apps/desktop/src/pages/Orders.tsx`

- [ ] **Step 1: Create Orders page**

Simplified version of web's OrderList:
- Status tabs (Pendentes, Em preparo, Prontos, Entregues)
- Order cards with items, customer, total, elapsed time
- Quick status action buttons
- Cancel button

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(desktop): orders management screen"
```

---

### Task 7: Cash Register + KDS + Settings

**Files:**
- Create: `apps/desktop/src/pages/CashRegister.tsx`
- Create: `apps/desktop/src/pages/KDS.tsx`
- Create: `apps/desktop/src/pages/Settings.tsx`
- Create: `apps/desktop/src/pages/PrinterManager.tsx`

- [ ] **Step 1: Create CashRegister page**

Open/close with balance, closing summary. Same as POS web but standalone page.

- [ ] **Step 2: Create KDS page**

Adapted from web KDS — grid cards with tabs, checkboxes, timer.

- [ ] **Step 3: Create Settings page**

Desktop-specific settings: API URL, auto-confirm toggle, auto-print toggle, sound toggle, paper width, minimize to tray.

- [ ] **Step 4: Create PrinterManager page**

Placeholder for Phase 3 (native printing). For now: shows "Impressao nativa sera adicionada em breve. Use o QZ Tray via navegador."

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(desktop): cash register, KDS, settings, printer placeholder"
```

---

### Task 8: First build test

- [ ] **Step 1: Build for current platform**

```bash
cd apps/desktop && pnpm tauri:build
```

- [ ] **Step 2: Verify installer is created**

Check `apps/desktop/src-tauri/target/release/bundle/` for platform-specific installer.

- [ ] **Step 3: Install and run the built app**

Test that the installed app connects to API, logs in, and creates an order.

- [ ] **Step 4: Commit any build fixes**

```bash
git commit -am "fix(desktop): build configuration adjustments"
```

---

## Future Phases (separate plans)

- **Phase 2**: WebSocket real-time orders + notifications + auto-confirm + sound
- **Phase 3**: Native ESC/POS printing in Rust (replace QZ Tray)
- **Phase 4**: SQLite offline cache + sync queue
- **Phase 5**: System tray + auto-update + GitHub Actions CI + download page
