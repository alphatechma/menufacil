# Waiter App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a standalone mobile-first waiter app (`apps/waiter`) for restaurant staff to take dine-in orders, manage tables, and handle bills.

**Architecture:** New app in `apps/waiter` following the same pattern as `apps/admin` (React + Vite + Zustand + Axios). Adds `WAITER` role to the shared UserRole enum and new waiter-specific permissions to the seed. Reuses all existing backend endpoints (tables, table-sessions, orders).

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind CSS v4, Zustand (persist), Axios, Lucide React, Socket.io-client

---

### Task 1: Add WAITER role to shared enums

**Files:**
- Modify: `packages/shared/src/enums.ts`

Add `WAITER = 'waiter'` to the UserRole enum, after `KITCHEN`.

```typescript
// In UserRole enum, add:
WAITER = 'waiter',
```

**Verify:** `pnpm --filter @menufacil/shared build` (or check that the shared package has no build step — it may just be raw TS consumed by other apps).

---

### Task 2: Add waiter permissions to seed

**Files:**
- Modify: `apps/api/src/database/seeds/run-seed.ts`

**Step 1:** Add `waiter` to the system modules array (after `dine_in`):

```typescript
{ key: 'waiter', name: 'Garcom', description: 'App do garcom para pedidos presenciais' },
```

**Step 2:** Add waiter-specific permissions to the `defaultPermissions` object:

```typescript
waiter: [
  { key: 'waiter:access', name: 'Acessar App Garcom' },
],
```

**Step 3:** Add `waiter` module to Enterprise plan's moduleKeys (and Pro if desired).

**Step 4:** Run seed: `pnpm --filter api run seed`

---

### Task 3: Support 7-day token for waiter role

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`

In the `generateTokens` method, check if the payload role is `waiter` and use 7d expiration:

```typescript
private generateTokens(payload: IJwtPayload): IAuthTokens {
  const isWaiter = payload.role === UserRole.WAITER;
  return {
    access_token: this.jwtService.sign(payload, {
      expiresIn: isWaiter ? '7d' : this.configService.get('JWT_EXPIRES_IN', '1h'),
    }),
    refresh_token: this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    }),
  };
}
```

Import `UserRole` from `@menufacil/shared` at top of file.

**Verify:** Build API: `pnpm --filter api run build`

---

### Task 4: Scaffold the waiter app

**Files to create:**
- `apps/waiter/package.json`
- `apps/waiter/index.html`
- `apps/waiter/vite.config.ts`
- `apps/waiter/tsconfig.json`
- `apps/waiter/tsconfig.node.json`
- `apps/waiter/src/main.tsx`
- `apps/waiter/src/App.tsx`
- `apps/waiter/src/index.css`
- `apps/waiter/src/vite-env.d.ts`

**package.json** — follow `apps/admin/package.json` pattern:

```json
{
  "name": "@menufacil/waiter",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1",
    "axios": "^1.7.9",
    "zustand": "^5.0.3",
    "lucide-react": "^0.468.0",
    "socket.io-client": "^4.8.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.7.2",
    "vite": "^6.0.0"
  }
}
```

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

**index.html:**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#FF6B35" />
    <title>MenuFacil - Garcom</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**tsconfig.node.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**src/vite-env.d.ts:**

```typescript
/// <reference types="vite/client" />
```

**src/index.css** — Tailwind v4 with theme tokens (copy color tokens from `apps/admin/src/index.css`):

```css
@import 'tailwindcss';

@theme {
  --color-primary: #FF6B35;
  --color-primary-dark: #E55A2B;
  --color-primary-light: #FF8A5C;
  --color-primary-50: #FFF3ED;
  --color-primary-100: #FFE4D4;
  --color-primary-200: #FFC4A8;
  --color-primary-300: #FF9F71;
  --color-primary-400: #FF6B35;
  --color-primary-500: #F54E0F;
  --color-primary-600: #E63B06;
  --color-primary-700: #BE2C07;
  --color-primary-800: #97250E;
  --color-primary-900: #7A220F;
  --color-secondary: #2D3436;
  --color-success: #00B894;
  --color-warning: #FFEAA7;
  --color-danger: #E17055;
  --color-accent: #FDCB6E;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8fafc;
}
```

**src/main.tsx:**

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

**src/App.tsx** — placeholder:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-4 text-center text-gray-500">Waiter App - Em construcao</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Verify:** `pnpm install && pnpm --filter @menufacil/waiter dev` — app should load on port 5176.

---

### Task 5: Auth store and API service

**Files to create:**
- `apps/waiter/src/store/authStore.ts`
- `apps/waiter/src/services/api.ts`
- `apps/waiter/src/utils/cn.ts`

**authStore.ts** — Zustand store with persist (follow `apps/admin/src/store/authStore.ts` pattern):

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface PlanInfo {
  id: string;
  name: string;
  price: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  modules: string[];
  permissions: string[];
  plan: PlanInfo | null;
  isAuthenticated: boolean;
  login: (data: {
    user: User;
    access_token: string;
    refresh_token: string;
    tenant_slug: string;
    modules?: string[];
    permissions?: string[];
    plan?: PlanInfo | null;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      modules: [],
      permissions: [],
      plan: null,
      isAuthenticated: false,
      login: (data) =>
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tenantSlug: data.tenant_slug,
          modules: (data.modules || []).map((m: any) => (typeof m === 'string' ? m : m.key)),
          permissions: data.permissions || [],
          plan: data.plan || null,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenantSlug: null,
          modules: [],
          permissions: [],
          plan: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'menufacil-waiter-auth', version: 1 },
  ),
);
```

**services/api.ts** — Axios instance with interceptors (follow `apps/admin/src/services/api.ts` pattern):

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const { accessToken, tenantSlug } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, logout, login } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = api.post('/auth/refresh', { refresh_token: refreshToken });
        }

        const res = await refreshPromise!;
        isRefreshing = false;
        refreshPromise = null;

        const state = useAuthStore.getState();
        login({
          user: state.user!,
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
          tenant_slug: state.tenantSlug!,
          modules: state.modules,
          permissions: state.permissions,
          plan: state.plan,
        });

        // Retry original request
        error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
        return api(error.config);
      } catch {
        isRefreshing = false;
        refreshPromise = null;
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

**utils/cn.ts:**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

Note: add `clsx` and `tailwind-merge` to package.json dependencies.

**Verify:** `pnpm --filter @menufacil/waiter build`

---

### Task 6: Login page

**Files to create:**
- `apps/waiter/src/pages/Login.tsx`
- `apps/waiter/src/components/ProtectedRoute.tsx`

**Modify:** `apps/waiter/src/App.tsx`

**Login.tsx** — fullscreen mobile login form:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/staff/login', { email, password });
      login(data);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MenuFacil</h1>
          <p className="text-sm text-gray-500 mt-1">Area do Garcom</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Sua senha"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**ProtectedRoute.tsx:**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

**Update App.tsx:**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="p-4 text-center text-gray-500">Home - Em construcao</div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

**Verify:** Login on `http://localhost:5176/login` with a staff user. Should redirect to `/` after login.

---

### Task 7: Tables Home page (main screen)

**Files to create:**
- `apps/waiter/src/pages/Tables.tsx`
- `apps/waiter/src/hooks/useSocket.ts`

**Tables.tsx** — grid of tables with real-time status:

The main screen shows all tables in a responsive grid. Each table card shows:
- Table number (large, centered)
- Capacity badge
- Status color (green=available, red=occupied, yellow=reserved, gray=maintenance)
- Number of active orders (badge) if occupied
- Tap to navigate to table detail

Fetch tables via `GET /tables`. Subscribe to WebSocket `table:status-updated` for real-time updates.

Use `useEffect` polling every 30s as fallback, plus WebSocket for instant updates.

**useSocket.ts** — socket.io hook:

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket(events: Record<string, (...args: any[]) => void>) {
  const tenantSlug = useAuthStore((s) => s.tenantSlug);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Get tenant ID from auth store user
      const user = useAuthStore.getState().user;
      if (user?.tenant_id) {
        socket.emit('join:tenant-tables', { tenantId: user.tenant_id });
        socket.emit('join:tenant-orders', { tenantId: user.tenant_id });
      }
    });

    for (const [event, handler] of Object.entries(events)) {
      socket.on(event, handler);
    }

    return () => {
      socket.disconnect();
    };
  }, [tenantSlug]);
}
```

**Tables page** should include:
- Header: "Mesas" title + user name/logout button
- Pull-to-refresh (simple refetch on scroll or button)
- Grid: 2 columns on small screens, 3 on medium, 4 on large
- Each table card: number, capacity, status color, active orders count
- Tap navigates to `/tables/:tableId`
- FAB or header button to open a session on an available table

**Verify:** Should load tables from API and display them in a grid.

---

### Task 8: Table Detail page

**Files to create:**
- `apps/waiter/src/pages/TableDetail.tsx`

Shows the selected table info and active session. Sections:

**Header:** Back button + "Mesa N" title

**Session Info:** If no active session, show "Mesa disponivel" + "Abrir Mesa" button. If session exists, show opened_at time and session actions.

**Orders List:** Fetch orders for the active session. Show each order with: order_number, status badge, items summary, total. Real-time updates via WebSocket.

**Action Buttons** (bottom sticky bar):
- "Novo Pedido" (primary, navigates to `/tables/:tableId/new-order`)
- "Ver Conta" (outline, navigates to `/tables/:tableId/bill`)
- "Transferir" (ghost, opens transfer modal)
- "Fechar Mesa" (danger, closes session after confirmation)

**Transfer modal:** List available tables, tap to select, confirm transfer.

API calls:
- `GET /table-sessions/active/:tableId` — get active session
- `GET /table-sessions/:sessionId` — session with orders detail
- `POST /table-sessions/:sessionId/transfer` — transfer table
- `POST /table-sessions/:sessionId/close` — close session

**Verify:** Navigate from Tables grid to detail, see session info and orders.

---

### Task 9: New Order page (fast interface)

**Files to create:**
- `apps/waiter/src/pages/NewOrder.tsx`

This is the core screen. Optimized for speed:

**Layout:**
- Sticky top: search bar (full width, autofocus)
- Below search: horizontal scrolling category chips (pill buttons)
- Product list: compact cards (name, price, +/- quantity buttons)
- Bottom sticky: order summary bar ("N itens - R$ X,XX" + "Enviar Pedido" button)

**Behavior:**
1. Fetch products via `GET /products` (all products for the tenant)
2. Fetch categories via `GET /categories`
3. Search filters products by name (client-side, instant)
4. Category chip filters products by category_id
5. Tapping "+" on a product adds it to local order state (quantity 1)
6. If product has variations, show inline variation selector (small pills)
7. If product has extras, show checkboxes inline
8. Long-press or tap product name to add notes for that item
9. "Enviar Pedido" sends `POST /orders` with:
   ```json
   {
     "items": [{ "product_id", "variation_id?", "quantity", "notes?", "extras": [{ "extra_id" }] }],
     "order_type": "dine_in",
     "table_id": "<from route params>",
     "table_session_id": "<from active session>",
     "payment_method": "pending"
   }
   ```
10. On success: show toast, navigate back to table detail
11. If no active session exists, auto-open one before creating the order

API calls:
- `GET /products` — list all products
- `GET /categories` — list categories
- `POST /table-sessions/open` — open session if needed
- `POST /orders` — create order

**Verify:** Search products, add items, send order. Order should appear in table detail.

---

### Task 10: Bill page

**Files to create:**
- `apps/waiter/src/pages/TableBill.tsx`

Shows the bill for the active session.

**Layout:**
- Header: "Conta - Mesa N"
- Orders grouped: each order shows order_number, customer_name, items list with prices
- Total section: subtotal, total
- Action buttons:
  - "Dividir Igual" — opens modal with number picker (2-20 people), shows per-person value
  - "Dividir por Consumo" — shows breakdown by customer
  - "Fechar Conta" — closes session (confirm dialog), marks table as available

API calls:
- `GET /table-sessions/:sessionId/bill` — get bill summary
- `POST /table-sessions/:sessionId/split-equal` — split equally
- `GET /table-sessions/:sessionId/split-consumption` — split by customer
- `POST /table-sessions/:sessionId/close` — close session

**Verify:** View bill, split options, close session successfully.

---

### Task 11: Wire up routes and navigation

**Files:**
- Modify: `apps/waiter/src/App.tsx`

Final route structure:

```tsx
<Routes>
  <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
  <Route path="/" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
  <Route path="/tables/:tableId" element={<ProtectedRoute><TableDetail /></ProtectedRoute>} />
  <Route path="/tables/:tableId/new-order" element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
  <Route path="/tables/:tableId/bill" element={<ProtectedRoute><TableBill /></ProtectedRoute>} />
</Routes>
```

Add haptic feedback CSS for mobile (active:scale-95 on buttons).

**Verify:** Full flow: Login → Tables → Table Detail → New Order → Send → Back to Detail → Bill → Close Session. `pnpm --filter @menufacil/waiter build` should succeed.

---

### Task 12: Backend — allow waiter role access to existing endpoints

**Files:**
- Modify: `apps/api/src/common/guards/permissions.guard.ts` (if needed)

The existing `PermissionsGuard` gives implicit full access to `SUPER_ADMIN` and `ADMIN`. We need to ensure `WAITER` role users with the correct custom Role permissions can access:
- `GET /tables` (table:read)
- `GET /products` (product:read)
- `GET /categories` (category:read)
- `POST /orders` (order:create)
- `GET /orders` (order:read)
- All `/table-sessions/*` endpoints (table_session permissions)

Check that the guard properly checks the user's custom Role permissions array. If the guard already checks `permissions` from the JWT/DB, no changes are needed — just ensure the waiter's Role in the seed has the right permissions.

Update the seed to create a default "Garcom" role with:
```typescript
['order:create', 'order:read', 'order:update', 'table:read', 'table:update', 'table_session:read', 'table_session:update', 'product:read', 'category:read']
```

**Verify:** Login as waiter user, access `/tables` endpoint — should return 200.

---

### Summary of all files

**New files (apps/waiter):**
- `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`
- `src/store/authStore.ts`
- `src/services/api.ts`
- `src/utils/cn.ts`
- `src/hooks/useSocket.ts`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Login.tsx`
- `src/pages/Tables.tsx`
- `src/pages/TableDetail.tsx`
- `src/pages/NewOrder.tsx`
- `src/pages/TableBill.tsx`

**Modified files:**
- `packages/shared/src/enums.ts` — add WAITER role
- `apps/api/src/database/seeds/run-seed.ts` — add waiter module, permissions, default role
- `apps/api/src/modules/auth/auth.service.ts` — 7-day token for waiter
