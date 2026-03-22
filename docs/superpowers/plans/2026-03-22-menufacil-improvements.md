# MenuFacil Platform Improvements - Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement comprehensive business, analytics, engagement, and UX improvements across web and desktop apps.

**Architecture:** Full-stack features spanning NestJS API (new entities, endpoints, services), React frontend (new pages, components, dashboard widgets), and desktop app (mirroring web improvements). All new entities follow existing multi-tenant pattern with tenant_id scoping.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (API), React 19 + Vite 6 + Tailwind CSS v4 + RTK Query (Frontend), Tauri 2 (Desktop)

---

## Phase 1: UX Improvements (Frontend Only)

### Task 1.1: Dashboard Avançado
**Files:**
- Modify: `apps/web/src/pages/admin/Dashboard.tsx`
- Modify: `apps/api/src/modules/order/order.service.ts`
- Modify: `apps/web/src/api/api.ts`

**Steps:**
- [ ] Add period selector (today/7d/30d/custom) to dashboard
- [ ] Add period-over-period comparison (vs previous period)
- [ ] Add KPIs: ticket médio, taxa de cancelamento, pedidos por hora
- [ ] Add top 5 produtos mais vendidos widget
- [ ] Add new API endpoint `GET /orders/stats/advanced` with date range + comparison
- [ ] Mirror in desktop: `apps/desktop/src/pages/Dashboard.tsx`

### Task 1.2: Menu UX - Badges, Favoritos, Reordenar
**Files:**
- Modify: `apps/web/src/pages/storefront/Menu.tsx`
- Modify: `apps/web/src/pages/storefront/ProductDetail.tsx`
- Create: `apps/web/src/pages/storefront/Favorites.tsx`
- Modify: `apps/web/src/store/slices/cartSlice.ts`
- Modify: `apps/api/src/modules/product/product.service.ts`
- Modify: `apps/api/src/modules/order/order.service.ts`

**Steps:**
- [ ] Add `order_count` to product query (count from order_items)
- [ ] Add "Mais Pedido" badge on top 5 products in menu
- [ ] Add favorites system (localStorage for guests, API for logged-in)
- [ ] Create Favorites page with saved products
- [ ] Add "Pedir novamente" button on order history items
- [ ] Add dietary filter tags (vegetariano, vegano, sem glúten) - product field

### Task 1.3: Busca Inteligente
**Files:**
- Modify: `apps/web/src/components/ui/SearchInput.tsx`
- Create: `apps/web/src/components/ui/SmartSearch.tsx`
- Modify: `apps/web/src/pages/storefront/Menu.tsx`
- Modify: `apps/web/src/pages/admin/products/ProductList.tsx`

**Steps:**
- [ ] Create SmartSearch component with autocomplete dropdown
- [ ] Add fuzzy matching (Levenshtein distance) for typo tolerance
- [ ] Show popular/recent searches
- [ ] Highlight matching text in results
- [ ] Apply to storefront menu and admin product list

### Task 1.4: Ações em Lote (Bulk Operations)
**Files:**
- Modify: `apps/web/src/pages/admin/products/ProductList.tsx`
- Modify: `apps/web/src/pages/admin/orders/OrderList.tsx`
- Modify: `apps/api/src/modules/product/product.controller.ts`
- Modify: `apps/api/src/modules/product/product.service.ts`
- Modify: `apps/api/src/modules/order/order.controller.ts`
- Modify: `apps/api/src/modules/order/order.service.ts`

**Steps:**
- [ ] Add checkbox selection to product list with select all
- [ ] Add bulk actions: ativar/desativar, reajustar preços (% ou fixo), deletar
- [ ] Add `PUT /products/bulk` endpoint for bulk operations
- [ ] Add checkbox selection to order list
- [ ] Add bulk actions: cancelar selecionados, marcar como preparando
- [ ] Add `PUT /orders/bulk-status` endpoint
- [ ] Mirror bulk product actions in desktop PDV settings

### Task 1.5: Checkout UX
**Files:**
- Modify: `apps/web/src/pages/storefront/Checkout.tsx`
- Modify: `apps/web/src/pages/storefront/OrderConfirmation.tsx`

**Steps:**
- [ ] Show estimated delivery time after zone selection (before payment)
- [ ] Add checkout progress indicator (steps: Entrega → Pagamento → Confirmação)
- [ ] Show order summary sidebar on desktop
- [ ] Improve payment method cards with better visual feedback

---

## Phase 2: Analytics & BI

### Task 2.1: Advanced Analytics API
**Files:**
- Create: `apps/api/src/modules/analytics/analytics.module.ts`
- Create: `apps/api/src/modules/analytics/analytics.controller.ts`
- Create: `apps/api/src/modules/analytics/analytics.service.ts`

**Steps:**
- [ ] Create analytics module with endpoints:
  - `GET /analytics/overview` - revenue, orders, customers, ticket médio (with comparison)
  - `GET /analytics/products` - top products, profitability, category breakdown
  - `GET /analytics/customers` - new vs returning, LTV, frequency, churn risk
  - `GET /analytics/delivery` - delivery person performance, avg time, zone stats
  - `GET /analytics/hourly` - orders by hour of day (heatmap data)
- [ ] All endpoints accept date range + comparison period
- [ ] Register in AppModule

### Task 2.2: Analytics Dashboard Page
**Files:**
- Create: `apps/web/src/pages/admin/analytics/AnalyticsDashboard.tsx`
- Create: `apps/web/src/pages/admin/analytics/ProductAnalytics.tsx`
- Create: `apps/web/src/pages/admin/analytics/CustomerAnalytics.tsx`
- Create: `apps/web/src/pages/admin/analytics/DeliveryAnalytics.tsx`
- Modify: `apps/web/src/api/api.ts` (add RTK Query hooks)
- Modify: router files to add routes

**Steps:**
- [ ] Create AnalyticsDashboard with tabs: Visão Geral, Produtos, Clientes, Entregas
- [ ] Visão Geral: revenue chart, KPI cards with comparison arrows, orders heatmap
- [ ] Produtos: top sellers table, profitability chart, category pie
- [ ] Clientes: new vs returning chart, LTV histogram, churn risk list
- [ ] Entregas: performance scoreboard, avg delivery time trend, zone heatmap
- [ ] Add export CSV/PDF buttons on each tab
- [ ] Mirror in desktop app

### Task 2.3: Reports Export
**Files:**
- Create: `apps/api/src/modules/analytics/analytics-export.service.ts`
- Modify: `apps/api/src/modules/analytics/analytics.controller.ts`

**Steps:**
- [ ] Add `GET /analytics/export/csv?type=products&from=&to=` endpoint
- [ ] Add `GET /analytics/export/pdf?type=overview&from=&to=` endpoint
- [ ] Generate CSV with proper headers and BOM for Excel
- [ ] Generate PDF with basic layout (using pdfkit or similar)

---

## Phase 3: Fidelidade & Engajamento

### Task 3.1: Loyalty Tiers (Bronze/Prata/Ouro)
**Files:**
- Create: `apps/api/src/modules/loyalty/entities/loyalty-tier.entity.ts`
- Modify: `apps/api/src/modules/loyalty/loyalty.service.ts`
- Modify: `apps/api/src/modules/loyalty/loyalty.controller.ts`
- Create: `apps/web/src/pages/admin/loyalty/LoyaltyTiers.tsx`
- Modify: `apps/web/src/pages/storefront/Account.tsx`

**Steps:**
- [ ] Create LoyaltyTier entity (name, min_points, multiplier, benefits JSON, icon, color)
- [ ] Seed default tiers: Bronze (0pts, 1x), Prata (500pts, 1.5x), Ouro (2000pts, 2x)
- [ ] Add tier calculation to customer profile endpoint
- [ ] Add tier display in storefront account page with progress bar
- [ ] Add admin page to manage tiers
- [ ] Apply multiplier when earning points on orders

### Task 3.2: Programa de Indicação (Referral)
**Files:**
- Create: `apps/api/src/modules/referral/referral.module.ts`
- Create: `apps/api/src/modules/referral/referral.entity.ts`
- Create: `apps/api/src/modules/referral/referral.service.ts`
- Create: `apps/api/src/modules/referral/referral.controller.ts`
- Create: `apps/web/src/pages/storefront/Referral.tsx`
- Create: `apps/web/src/pages/admin/referral/ReferralSettings.tsx`

**Steps:**
- [ ] Create Referral entity (referrer_id, referred_id, code, status, reward_given)
- [ ] Generate unique referral code per customer
- [ ] Award points to referrer when referred customer makes first order
- [ ] Create referral sharing page (WhatsApp, copy link)
- [ ] Admin settings: points per referral, enable/disable
- [ ] Dashboard widget showing referral stats

### Task 3.3: Sistema de Avaliação/Feedback
**Files:**
- Create: `apps/api/src/modules/review/review.module.ts`
- Create: `apps/api/src/modules/review/review.entity.ts`
- Create: `apps/api/src/modules/review/review.service.ts`
- Create: `apps/api/src/modules/review/review.controller.ts`
- Create: `apps/web/src/pages/storefront/ReviewOrder.tsx`
- Create: `apps/web/src/pages/admin/reviews/ReviewList.tsx`

**Steps:**
- [ ] Create Review entity (order_id, customer_id, rating 1-5, comment, created_at)
- [ ] Prompt review after order delivered (storefront notification)
- [ ] Show average rating on products in menu
- [ ] Admin review management page with filters and reply capability
- [ ] NPS calculation from ratings

### Task 3.4: Carrinho Abandonado
**Files:**
- Create: `apps/api/src/modules/abandoned-cart/abandoned-cart.module.ts`
- Create: `apps/api/src/modules/abandoned-cart/abandoned-cart.entity.ts`
- Create: `apps/api/src/modules/abandoned-cart/abandoned-cart.service.ts`
- Create: `apps/api/src/modules/abandoned-cart/abandoned-cart.controller.ts`
- Create: `apps/web/src/pages/admin/marketing/AbandonedCarts.tsx`
- Modify: `apps/web/src/store/slices/cartSlice.ts`

**Steps:**
- [ ] Create AbandonedCart entity (customer_id, items JSON, total, recovered, created_at)
- [ ] Save cart state to API when customer is logged in and adds items
- [ ] Mark as abandoned after 30min without checkout
- [ ] Admin page showing abandoned carts with recovery rate
- [ ] Integration with WhatsApp flow for automated recovery message
- [ ] "Recuperar carrinho" link that restores cart state

### Task 3.5: Segmentação de Clientes (RFM)
**Files:**
- Create: `apps/api/src/modules/analytics/customer-segmentation.service.ts`
- Modify: `apps/api/src/modules/analytics/analytics.controller.ts`
- Create: `apps/web/src/pages/admin/customers/CustomerSegments.tsx`

**Steps:**
- [ ] Calculate RFM scores per customer (Recency, Frequency, Monetary)
- [ ] Auto-segment: Champions, Loyal, At Risk, Lost, New
- [ ] API endpoint `GET /analytics/segments` with customer counts per segment
- [ ] Admin page showing segments with customer lists
- [ ] Segment-based targeting for coupons and WhatsApp campaigns

---

## Phase 4: Promoções & Precificação

### Task 4.1: Motor de Promoções
**Files:**
- Create: `apps/api/src/modules/promotion/promotion.module.ts`
- Create: `apps/api/src/modules/promotion/promotion.entity.ts`
- Create: `apps/api/src/modules/promotion/promotion.service.ts`
- Create: `apps/api/src/modules/promotion/promotion.controller.ts`
- Create: `apps/web/src/pages/admin/promotions/PromotionList.tsx`
- Create: `apps/web/src/pages/admin/promotions/PromotionForm.tsx`
- Modify: `apps/web/src/pages/storefront/Menu.tsx`

**Steps:**
- [ ] Create Promotion entity:
  - type: combo, happy_hour, weekday, buy_x_get_y
  - rules JSON (products, quantities, conditions)
  - schedule (days of week, start_time, end_time)
  - discount (percent or fixed)
  - active, valid_from, valid_to
- [ ] Promotion evaluation service (checks active promotions against cart)
- [ ] Apply promotions automatically at checkout
- [ ] Show promotion badges on menu items ("Happy Hour -20%")
- [ ] Admin CRUD for promotions with schedule builder
- [ ] "Compre 2 leve 3", "Pizza + Refrigerante R$X" combo types

### Task 4.2: Carteira Digital
**Files:**
- Create: `apps/api/src/modules/wallet/wallet.module.ts`
- Create: `apps/api/src/modules/wallet/wallet.entity.ts`
- Create: `apps/api/src/modules/wallet/wallet-transaction.entity.ts`
- Create: `apps/api/src/modules/wallet/wallet.service.ts`
- Create: `apps/api/src/modules/wallet/wallet.controller.ts`
- Create: `apps/web/src/pages/storefront/Wallet.tsx`
- Modify: `apps/web/src/pages/storefront/Checkout.tsx`

**Steps:**
- [ ] Create Wallet entity (customer_id, balance) and WalletTransaction (type: credit/debit, amount, description)
- [ ] API: add credit, check balance, pay with wallet
- [ ] Add "wallet" as payment method in checkout
- [ ] Customer wallet page showing balance and transaction history
- [ ] Admin: add credit to customer wallet manually
- [ ] Cashback option: X% of order value back to wallet

---

## Phase 5: Operações Inteligentes

### Task 5.1: Estoque Inteligente
**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Create: `apps/api/src/modules/inventory/inventory-alert.service.ts`
- Modify: `apps/web/src/pages/admin/inventory/InventoryList.tsx`
- Create: `apps/web/src/pages/admin/inventory/LowStockAlerts.tsx`

**Steps:**
- [ ] Add low stock alert system (when quantity < min_stock)
- [ ] Create notification when stock is low (bell icon in admin header)
- [ ] Auto-deduct stock when order is confirmed (based on recipes)
- [ ] Dashboard widget showing low stock items count
- [ ] Reorder suggestion based on avg daily consumption

### Task 5.2: Entrega Inteligente
**Files:**
- Modify: `apps/api/src/modules/order/order.service.ts`
- Create: `apps/api/src/modules/delivery-person/auto-assign.service.ts`
- Modify: `apps/web/src/pages/admin/orders/OrderList.tsx`
- Create: `apps/web/src/pages/admin/delivery/DeliveryScoreboard.tsx`

**Steps:**
- [ ] Auto-assign algorithm: available driver with fewest active orders in matching zone
- [ ] Delivery person scoring: avg delivery time, completion rate, customer ratings
- [ ] Scoreboard page showing driver rankings
- [ ] Admin can override auto-assignment
- [ ] Notify driver via WebSocket when assigned

### Task 5.3: PWA & Push Notifications
**Files:**
- Create: `apps/web/public/sw.js`
- Create: `apps/web/public/manifest.json`
- Modify: `apps/web/index.html`
- Create: `apps/web/src/hooks/usePushNotifications.ts`
- Modify: `apps/api/src/modules/notification/notification.service.ts`

**Steps:**
- [ ] Add Web App Manifest for PWA install
- [ ] Service Worker for offline menu caching
- [ ] Push notification subscription (VAPID keys)
- [ ] Send push on order status changes
- [ ] Add "Install App" prompt on storefront
- [ ] Cache storefront assets for offline browsing
