# MenuFacil Desktop App — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Desktop application for MenuFacil built with Tauri 2 + React, focused on POS operations, order management, and native thermal printing. Lives at `apps/desktop` in the monorepo.

## Architecture

- **Tauri 2** (Rust backend + WebView frontend)
- **Frontend**: React 19 + Vite + Tailwind CSS (shared stack with `apps/web`)
- **Native modules (Rust)**: ESC/POS printing, SQLite cache, system tray, OS notifications
- **API**: Connects to production API via HTTPS + WebSocket for real-time orders
- **Offline**: SQLite local cache — PDV operates offline, syncs when connected

## Screens

| Screen | Purpose |
|--------|---------|
| Login | Admin email/password auth, persists token locally |
| PDV | Main fullscreen POS — product catalog, cart, payment, customer |
| Orders | Order list with status actions, real-time updates |
| KDS | Kitchen display (can run on second monitor) |
| Cash Register | Open/close with auto-print receipts |
| Printer Manager | Detect printers, select default + kitchen, print queue, test |
| Settings | Auto-confirm toggle, printer config, paper size, sound |

## Native Printing (Rust)

- Direct USB communication with thermal printers (no QZ Tray dependency)
- ESC/POS command generation in Rust
- Print queue with retry on failure
- Support 2 simultaneous printers (counter + kitchen)
- Paper width config: 80mm (48 chars), 58mm (32 chars), 57mm (30 chars)
- Auto-print on new order (configurable)

## Real-time Order Flow

1. WebSocket connection to API (`order:new`, `order:status-updated` events)
2. On new order:
   - Native OS notification (system tray)
   - Intermittent alert sound until acknowledged
   - Auto-print to configured printer(s)
   - Auto-confirm (configurable): changes status pending → confirmed automatically
3. App persists in system tray when minimized
4. Badge count on tray icon for pending orders

## Offline Cache

- **SQLite** via Tauri SQL plugin
- Cached data: products, categories, customers, extras, tenant config
- Sync on connect (pull latest from API)
- Offline POS: orders created locally, queued for sync
- Visual indicator: "X pedidos pendentes de sync"
- Conflict resolution: server wins (offline orders get server-assigned order numbers on sync)

## Distribution

- **Windows**: .exe / .msi installer
- **macOS**: .dmg
- **Linux**: .deb / .AppImage
- **Auto-update**: Tauri updater via GitHub Releases
- **Download page**: menufacil.maistechtecnologia.com.br/download

## Project Structure

```
apps/desktop/
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs          # App entry, system tray, event handling
      printer.rs       # ESC/POS USB direct printing
      print_queue.rs   # Print job queue with retry
      cache.rs         # SQLite offline cache + sync
      tray.rs          # System tray icon + menu
      commands.rs      # Tauri IPC commands exposed to frontend
  src/
    main.tsx           # React entry
    App.tsx            # Router + layout
    pages/
      Login.tsx
      PDV.tsx          # Full POS (reuses logic from apps/web POS)
      Orders.tsx       # Order management
      KDS.tsx          # Kitchen display
      CashRegister.tsx # Open/close cash register
      PrinterManager.tsx # Printer detection, selection, queue
      Settings.tsx     # App preferences
    components/
      DesktopLayout.tsx  # Minimal sidebar + system tray integration
      SyncIndicator.tsx  # Offline queue status
      OrderAlert.tsx     # New order notification overlay
    hooks/
      useWebSocket.ts    # WS connection to API
      useOfflineCache.ts # SQLite read/write
      usePrinter.ts      # Tauri IPC to Rust printer module
    utils/
      api.ts             # API client (reuses baseApi pattern)
      escpos.ts          # ESC/POS command builder (shared with web)
  package.json
  vite.config.ts
  tsconfig.json
```

## Shared Code with apps/web

- `packages/shared` — enums, constants, types
- `apps/desktop/src/utils/escpos.ts` — can import from `apps/web/src/utils/printService.ts` receipt builder logic
- `formatPrice`, `formatPhone` utilities reused
- RTK Query API pattern reused (same endpoints, different base URL config)

## Settings (persisted locally)

| Setting | Default | Description |
|---------|---------|-------------|
| `api_url` | `https://menufacil-api...` | API endpoint |
| `auto_confirm` | `false` | Auto-confirm new orders |
| `auto_print` | `true` | Print on new order |
| `default_printer` | - | Counter printer name |
| `kitchen_printer` | - | Kitchen printer name |
| `paper_width` | `48` | Chars per line (80mm) |
| `sound_enabled` | `true` | Alert sounds |
| `minimize_to_tray` | `true` | Keep running in tray |

## Security

- JWT token stored in OS keychain (Tauri secure storage)
- Tenant slug stored in app config
- No sensitive data in SQLite cache (no passwords, no payment data)
- HTTPS only for API communication

## Build & CI

- Tauri CLI for building platform-specific installers
- GitHub Actions workflow for cross-platform builds
- Signing: Windows (code signing cert), macOS (Apple Developer), Linux (unsigned)
- Release artifacts uploaded to GitHub Releases for auto-updater
