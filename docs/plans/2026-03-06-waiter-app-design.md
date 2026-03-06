# Waiter App Design

## Goal
App separado (`apps/waiter`) mobile-first para garcons tirarem pedidos presenciais, gerenciarem mesas e contas.

## Architecture
- New app: `apps/waiter` (React + Vite + Tailwind, same stack as web)
- New role: `UserRole.WAITER = 'waiter'` in `@menufacil/shared`
- Reuses: same backend API, RTK Query, table-session and order endpoints
- Auth: `/auth/staff/login`, 7-day token for waiter role
- Realtime: WebSocket for table/order status updates

## Screens
1. Login (email/password, fullscreen)
2. Home - Table Map (grid with status colors, badges, real-time)
3. Table Detail (orders list, actions: new order, bill, transfer, split, close)
4. New Order (search bar, category chips, compact product cards, inline variations/extras, floating send button)
5. Table Bill (session summary, split options, close account)

## Waiter Permissions
- order:create, order:read, order:update
- table:read, table:update
- table_session:read, table_session:update

## Token
- 7-day access token for waiter role
