# Figma MCP Design System Rules - MenuFacil

## Project Overview

MenuFacil is a multi-tenant restaurant SaaS platform built as a pnpm monorepo with 5 apps:
- `apps/web` — Main unified app (admin + customer storefront)
- `apps/admin` — Standalone admin panel
- `apps/customer` — Standalone customer app
- `apps/manager` — Super admin panel
- `apps/api` — NestJS backend

**Stack:** React 19, Vite 6, TypeScript, Tailwind CSS v4, Redux Toolkit + RTK Query, React Router v7, React Hook Form + Zod, Lucide React icons, Framer Motion, Recharts.

---

## Figma MCP Integration Flow

IMPORTANT: Follow these steps in order for every Figma-driven implementation.

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation
5. Translate the output (React + Tailwind) into this project's conventions, tokens, and component library
6. Validate against Figma screenshot for 1:1 visual parity before marking complete

---

## Design Tokens

Tokens are defined via `@theme` in each app's `index.css` using Tailwind CSS v4 syntax.

**Primary token file:** `apps/web/src/index.css`

### Color Tokens

```css
@theme {
  --color-primary: #FF6B35;
  --color-primary-dark: #E55A2B;
  --color-primary-light: #FF8A5C;
  --color-primary-50: #FFF3ED;
  --color-primary-100 through --color-primary-900;
  --color-secondary: #2D3436;
  --color-accent: #FDCB6E;
  --color-success: #00B894;
  --color-warning: #FFEAA7;
  --color-danger: #E17055;
}
```

### Tenant-Dynamic Colors (CSS Variables)

```css
:root {
  --tenant-primary: #FF6B35;
  --tenant-primary-dark: #E55A2B;
  --tenant-primary-light: #FF8F66;
}
```

Customer-facing components use `var(--tenant-primary)` for theming. Admin components use Tailwind `primary` classes directly.

### Rules

- IMPORTANT: Never hardcode hex colors. Use Tailwind token classes: `bg-primary`, `text-primary-dark`, `border-primary-50`, etc.
- For customer-facing/storefront code, use CSS variables: `bg-[var(--tenant-primary)]`, `hover:bg-[var(--tenant-primary-dark)]`
- For semantic colors use: `text-gray-900` (headings), `text-gray-700` (body), `text-gray-500` (secondary), `text-gray-400` (muted)
- Super-admin uses a different primary: `#4F46E5` (indigo) — check `apps/manager/src/index.css`

### Typography

- Font: `'Inter', system-ui, -apple-system, sans-serif`
- Headings: `font-bold text-gray-900`
- Body: `text-sm text-gray-700`
- Labels: `text-sm font-medium text-gray-700`
- Muted/secondary: `text-xs text-gray-500` or `text-gray-400`

### Spacing & Border Radius

- Cards: `rounded-2xl`
- Buttons/Inputs: `rounded-xl`
- Small elements (badges, tags): `rounded-full` or `rounded-lg`
- Consistent padding: inputs `px-4 py-3`, buttons `px-4 py-2.5` (md), cards `p-6`

---

## Component Library

UI components are in `apps/web/src/components/ui/`. IMPORTANT: Always reuse these before creating new ones.

### Available Components

| Component | Path | Props/Variants |
|-----------|------|----------------|
| `Button` | `ui/Button.tsx` | variant: `primary \| secondary \| danger \| ghost \| outline`, size: `sm \| md \| lg`, loading |
| `Input` | `ui/Input.tsx` | Standard HTML input with project styling |
| `Textarea` | `ui/Textarea.tsx` | Standard textarea |
| `Select` | `ui/Select.tsx` | Standard select |
| `Toggle` | `ui/Toggle.tsx` | Toggle switch |
| `Modal` | `ui/Modal.tsx` | open, onClose, title, children |
| `ConfirmDialog` | `ui/ConfirmDialog.tsx` | Confirmation modal |
| `Card` | `ui/Card.tsx` | Wrapper with `bg-white rounded-2xl shadow-sm border border-gray-100` |
| `Badge` | `ui/Badge.tsx` | variant: `default \| success \| warning \| danger \| info` |
| `Spinner` | `ui/Spinner.tsx` | Loading spinner |
| `EmptyState` | `ui/EmptyState.tsx` | Empty data placeholder |
| `ErrorAlert` | `ui/ErrorAlert.tsx` | Error message display |
| `Tabs` | `ui/Tabs.tsx` | Tab navigation |
| `Table` | `ui/Table.tsx` | Generic table with columns, data, keyExtractor |
| `ImageUpload` | `ui/ImageUpload.tsx` | Image upload with preview |
| `PasswordInput` | `ui/PasswordInput.tsx` | Password with show/hide toggle |
| `PriceInput` | `ui/PriceInput.tsx` | Currency-formatted input |
| `SearchInput` | `ui/SearchInput.tsx` | Search with icon |
| `PageHeader` | `ui/PageHeader.tsx` | Page title with optional back button and actions |
| `FormCard` | `ui/FormCard.tsx` | Card wrapper for form sections |
| `FormField` | `ui/FormField.tsx` | React Hook Form Controller wrapper with label and error |

### Component Patterns

- All components accept `className` prop for composition via `cn()` utility
- Use `forwardRef` for form elements (Input, Button, Textarea)
- Variant maps defined as plain objects (no cva/class-variance-authority)
- `cn()` utility at `@/utils/cn.ts` combines `clsx` + `tailwind-merge`

```tsx
import { cn } from '@/utils/cn';

// Usage pattern:
<div className={cn('base-classes', conditional && 'conditional-class', className)}>
```

### CSS Component Classes

`apps/web/src/index.css` also defines reusable CSS component classes for customer-facing pages:

- `.btn-primary` — Tenant-themed primary button
- `.btn-outline` — Tenant-themed outline button
- `.card` — Standard card with hover shadow
- `.badge` — Inline badge
- `.input-field` — Tenant-themed input

---

## Styling Approach

- **Framework:** Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **Methodology:** Utility-first with `cn()` for merging
- **No CSS Modules or Styled Components** — purely Tailwind utilities
- **Responsive:** Mobile-first with `sm:`, `md:`, `lg:` breakpoints. Mobile sidebar uses overlay pattern.
- **Animations:** Tailwind `transition-all duration-200`, `active:scale-95` on buttons. Custom `animate-slide-in-left` for mobile sidebar.

### Styling Rules

- IMPORTANT: Use Tailwind utility classes, not inline styles
- Interactive elements: add `transition-colors` or `transition-all duration-200`
- Buttons: add `active:scale-95` for press feedback
- Disabled states: `disabled:opacity-50 disabled:cursor-not-allowed`
- Focus states: `focus:ring-2 focus:ring-primary focus:ring-offset-2` or `focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`
- Hover states on cards: `hover:shadow-md`
- Gray palette: use Tailwind default grays (`gray-50` through `gray-900`)

---

## Icon System

- **Library:** `lucide-react` (v0.468+)
- **Import pattern:** Named imports from `lucide-react`
- **Sizing:** Consistent `w-5 h-5` for standard icons, `w-4 h-4` for small/inline
- IMPORTANT: DO NOT import or add new icon packages. Use only `lucide-react`.
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly. Do NOT create placeholders.

```tsx
import { ArrowLeft, Settings, Package } from 'lucide-react';

<ArrowLeft className="w-5 h-5" />
```

---

## Asset Handling

- No dedicated assets directory currently in use
- Images handled via `ImageUpload` component or external URLs
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- IMPORTANT: DO NOT import/add new icon packages — all assets should come from the Figma payload or lucide-react
- Store downloaded assets in `apps/web/public/` if static assets are needed

---

## Project Structure & Conventions

### File Organization

```
apps/web/src/
  components/
    ui/          # Reusable UI primitives (Button, Input, Card, etc.)
    cart/        # Cart-specific components
    layout/      # AdminLayout, CustomerLayout
  pages/
    admin/       # Admin panel pages
      categories/, products/, orders/, staff/, etc.
    storefront/  # Customer-facing pages (Menu, Checkout, Account, etc.)
    LandingPage.tsx
  store/
    slices/      # Redux slices (adminAuthSlice, cartSlice, tenantSlice, uiSlice)
    hooks.ts     # Typed useAppDispatch, useAppSelector
    index.ts     # Store configuration
  hooks/         # Custom hooks (usePermission, etc.)
  services/      # RTK Query API slices
  utils/         # Utility functions (cn.ts)
```

### Naming Conventions

- Components: PascalCase (`ProductForm.tsx`, `CategoryList.tsx`)
- Page pattern: `{Entity}List.tsx`, `{Entity}Form.tsx`, `{Entity}Detail.tsx`
- Hooks: `use{Name}.ts`
- Store slices: `{name}Slice.ts`

### Import Aliases

- Use `@/` path alias (maps to `src/`): `import { Button } from '@/components/ui/Button'`
- IMPORTANT: Always use `@/` imports, never relative paths beyond parent

### Form Patterns

- Forms use `react-hook-form` with `zod` validation via `@hookform/resolvers`
- Wrap fields with `FormField` component for label, error display, and Controller binding
- Form sections wrapped in `FormCard` component

### State Management

- Redux Toolkit for global state (auth, cart, tenant, UI)
- RTK Query for API calls
- `useAppSelector` and `useAppDispatch` typed hooks from `@/store/hooks`

### Layout Patterns

- Admin pages render inside `AdminLayout` (sidebar + header + `<Outlet />`)
- Customer pages render inside `CustomerLayout`
- Admin pages use `PageHeader` for consistent title + back button + actions

### Responsive Design

- Mobile-first approach
- Desktop sidebar: `hidden lg:flex`, width `w-64` (expanded) / `w-[72px]` (collapsed)
- Mobile sidebar: overlay with `fixed inset-0 z-50 lg:hidden`
- Content padding: `p-4 lg:p-6`

---

## Implementation Checklist

When implementing a Figma design:

1. Check if existing UI components (`apps/web/src/components/ui/`) can be reused
2. Map Figma colors to the project's `@theme` tokens — never use raw hex values
3. Use `lucide-react` icons — match the closest icon from the library
4. Follow the `rounded-2xl` (cards) / `rounded-xl` (buttons/inputs) border radius system
5. Use `cn()` utility for conditional and merged class names
6. Follow the page structure pattern: `PageHeader` + content in cards
7. Ensure responsive behavior with `lg:` breakpoint for desktop adaptations
8. For customer-facing pages, use `var(--tenant-primary)` CSS variables for theming
9. Validate final output against the Figma screenshot for 1:1 visual fidelity
