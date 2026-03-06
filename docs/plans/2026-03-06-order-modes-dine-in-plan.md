# Order Modes + Dine-in Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add delivery/pickup/dine-in order modes as feature flags, and a complete dine-in module with tables, sessions, reservations, floor plan, and bill splitting.

**Architecture:** Extend the shared enums with OrderType and new OrderStatus values. Add order_modes JSONB to Tenant. Create new NestJS modules (table, table-session, reservation, floor-plan) with entities, services, controllers. Modify order creation to accept order_type and conditionally handle address/delivery. Update storefront checkout with mode selection. Add admin pages for table management, floor plan editor, and reservation management. Update seed, landing page, and super-admin.

**Tech Stack:** NestJS + TypeORM (backend), React + Redux + Tailwind (frontend), shared enums package, Socket.IO for real-time table status.

---

## Phase 1: Shared Enums & Backend Foundation

### Task 1: Add OrderType enum and new OrderStatus values

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/constants.ts`

**Step 1: Add enums to shared package**

In `packages/shared/src/enums.ts`, add after `OrderStatus` enum:

```typescript
export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  DINE_IN = 'dine_in',
}
```

Add to `OrderStatus` enum (before CANCELLED):
```typescript
  PICKED_UP = 'picked_up',
  SERVED = 'served',
```

**Step 2: Update ORDER_STATUS_TRANSITIONS in constants.ts**

Replace the current transitions with:
```typescript
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'picked_up', 'served', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  picked_up: [],
  served: [],
  cancelled: [],
};
```

**Step 3: Add new WebSocket events**

In `constants.ts` WEBSOCKET_EVENTS, add:
```typescript
TABLE_STATUS_UPDATED: 'table:status-updated',
RESERVATION_NEW: 'reservation:new',
```

In WEBSOCKET_ROOMS, add:
```typescript
tenantTables: (tenantId: string) => `tenant:${tenantId}:tables`,
```

**Step 4: Export OrderType from index**

Check `packages/shared/src/index.ts` and ensure `OrderType` is exported.

**Step 5: Commit**
```bash
git add packages/shared/
git commit -m "feat: add OrderType enum, pickup/dine-in status values, and table websocket events"
```

---

### Task 2: Add order_modes to Tenant entity

**Files:**
- Modify: `apps/api/src/modules/tenant/entities/tenant.entity.ts`
- Modify: `apps/api/src/modules/tenant/dto/create-tenant.dto.ts`

**Step 1: Add order_modes column to Tenant entity**

After `notification_settings` column, add:
```typescript
@Column({ type: 'jsonb', nullable: true, default: () => "'{\"delivery\": true, \"pickup\": false, \"dine_in\": false}'" })
order_modes: {
  delivery: boolean;
  pickup: boolean;
  dine_in: boolean;
};
```

**Step 2: Add to CreateTenantDto**

Add optional field:
```typescript
@IsOptional()
@IsObject()
order_modes?: {
  delivery?: boolean;
  pickup?: boolean;
  dine_in?: boolean;
};
```

**Step 3: Commit**
```bash
git add apps/api/src/modules/tenant/
git commit -m "feat: add order_modes JSONB to tenant entity"
```

---

### Task 3: Add order_type and table fields to Order entity

**Files:**
- Modify: `apps/api/src/modules/order/entities/order.entity.ts`
- Modify: `apps/api/src/modules/order/dto/create-order.dto.ts`
- Modify: `apps/api/src/modules/order/order.service.ts`

**Step 1: Add columns to Order entity**

Import `OrderType` from shared. Add after `status` column:
```typescript
@Column({ type: 'enum', enum: OrderType, default: OrderType.DELIVERY })
order_type: OrderType;

@Column({ nullable: true })
table_id: string;

@Column({ nullable: true })
table_session_id: string;
```

Add timestamps for new statuses after `cancelled_at`:
```typescript
@Column({ type: 'timestamp', nullable: true })
picked_up_at: Date;

@Column({ type: 'timestamp', nullable: true })
served_at: Date;
```

**Step 2: Add order_type to CreateOrderDto**

Import `OrderType`. Add field:
```typescript
@ApiPropertyOptional({ enum: OrderType })
@IsOptional()
@IsEnum(OrderType)
order_type?: OrderType;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
table_id?: string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
table_session_id?: string;
```

**Step 3: Update order.service.ts create method**

After resolving address, add logic:
```typescript
const orderType = dto.order_type || OrderType.DELIVERY;

// Skip address/delivery fee for pickup and dine-in
if (orderType !== OrderType.DELIVERY) {
  resolvedAddress = null;
  deliveryFee = 0;
}
```

In the order creation object, add:
```typescript
order_type: orderType,
table_id: dto.table_id || undefined,
table_session_id: dto.table_session_id || undefined,
```

**Step 4: Update updateStatus method timestamp map**

Add to timestampMap:
```typescript
[OrderStatus.PICKED_UP]: 'picked_up_at',
[OrderStatus.SERVED]: 'served_at',
```

**Step 5: Commit**
```bash
git add apps/api/src/modules/order/
git commit -m "feat: add order_type, table_id, table_session_id to order entity and service"
```

---

### Task 4: Create Table module (entity, service, controller)

**Files:**
- Create: `apps/api/src/modules/table/entities/table.entity.ts`
- Create: `apps/api/src/modules/table/dto/create-table.dto.ts`
- Create: `apps/api/src/modules/table/dto/update-table.dto.ts`
- Create: `apps/api/src/modules/table/table.service.ts`
- Create: `apps/api/src/modules/table/table.controller.ts`
- Create: `apps/api/src/modules/table/table.module.ts`
- Modify: `apps/api/src/app.module.ts` (import TableModule)

**Step 1: Create Table entity**

```typescript
// apps/api/src/modules/table/entities/table.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

@Entity('tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  number: number;

  @Column({ nullable: true })
  label: string;

  @Column({ default: 4 })
  capacity: number;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ nullable: true })
  qr_code_url: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Step 2: Create DTOs**

```typescript
// create-table.dto.ts
import { IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';

export class CreateTableDto {
  @IsNumber()
  @Min(1)
  number: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
```

```typescript
// update-table.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateTableDto } from './create-table.dto';
import { TableStatus } from '../entities/table.entity';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
```

**Step 3: Create TableService**

CRUD operations + QR code URL generation (`/{slug}/mesa/{number}`). Method `findByTenant`, `create`, `update`, `delete`, `updateStatus`.

**Step 4: Create TableController**

Standard REST endpoints at `tables/`. Include:
- GET `/tables` — list all for tenant
- POST `/tables` — create
- PATCH `/tables/:id` — update
- DELETE `/tables/:id` — delete
- PATCH `/tables/:id/status` — update status
- GET `/tables/:id/qr` — get QR code data (returns URL for the table)

**Step 5: Create TableModule and register in AppModule**

**Step 6: Commit**
```bash
git add apps/api/src/modules/table/ apps/api/src/app.module.ts
git commit -m "feat: create Table module with entity, service, controller"
```

---

### Task 5: Create TableSession module

**Files:**
- Create: `apps/api/src/modules/table-session/entities/table-session.entity.ts`
- Create: `apps/api/src/modules/table-session/dto/`
- Create: `apps/api/src/modules/table-session/table-session.service.ts`
- Create: `apps/api/src/modules/table-session/table-session.controller.ts`
- Create: `apps/api/src/modules/table-session/table-session.module.ts`

**Step 1: Create TableSession entity**

```typescript
export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('table_sessions')
export class TableSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  table_id: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  opened_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ nullable: true })
  opened_by: string; // user_id of staff who opened, null if customer

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => RestaurantTable)
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTable;

  @OneToMany(() => Order, (order) => order.table_session_id)
  orders: Order[];
}
```

**Step 2: Create service with methods:**
- `openSession(tableId, tenantId, openedBy?)` — creates session, sets table status to OCCUPIED
- `closeSession(sessionId, tenantId)` — closes session, sets table to AVAILABLE, returns bill summary
- `getActiveSession(tableId, tenantId)` — get open session for table
- `transferTable(sessionId, newTableId, tenantId)` — move session to another table
- `mergeSessions(sourceSessionId, targetSessionId, tenantId)` — merge orders from source into target
- `getBillSummary(sessionId, tenantId)` — all orders with totals, grouped by customer if identified
- `splitBillEqual(sessionId, numberOfPeople)` — returns amount per person
- `splitBillByConsumption(sessionId)` — returns amounts grouped by customer_id

**Step 3: Create controller with endpoints:**
- POST `/table-sessions/open` — open session for a table
- POST `/table-sessions/:id/close` — close session
- GET `/table-sessions/:id` — get session details with orders
- GET `/table-sessions/active/:tableId` — get active session for table
- POST `/table-sessions/:id/transfer` — transfer to another table
- POST `/table-sessions/:id/merge` — merge with another session
- GET `/table-sessions/:id/bill` — get bill summary
- POST `/table-sessions/:id/split-equal` — split bill equally
- POST `/table-sessions/:id/split-consumption` — split by consumption

**Step 4: Register module**

**Step 5: Commit**
```bash
git add apps/api/src/modules/table-session/ apps/api/src/app.module.ts
git commit -m "feat: create TableSession module with session management and bill splitting"
```

---

### Task 6: Create Reservation module

**Files:**
- Create: `apps/api/src/modules/reservation/entities/reservation.entity.ts`
- Create: `apps/api/src/modules/reservation/dto/`
- Create: `apps/api/src/modules/reservation/reservation.service.ts`
- Create: `apps/api/src/modules/reservation/reservation.controller.ts`
- Create: `apps/api/src/modules/reservation/reservation.module.ts`

**Step 1: Create Reservation entity**

```typescript
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  table_id: string;

  @Column({ nullable: true })
  customer_id: string;

  @Column()
  customer_name: string;

  @Column()
  customer_phone: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time_start: string;

  @Column({ type: 'time', nullable: true })
  time_end: string;

  @Column()
  party_size: number;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Step 2: Service methods:**
- `create(dto, tenantId)` — create reservation (status: PENDING)
- `findByTenant(tenantId, filters: { date?, status? })` — list with filters
- `updateStatus(id, status, tenantId)` — confirm/cancel/complete/no-show
- `findAvailableTables(tenantId, date, timeStart, partySize)` — tables not reserved at that time

**Step 3: Two controllers:**

Admin controller at `reservations/`:
- GET `/reservations` — list for tenant (with filters)
- PATCH `/reservations/:id/status` — update status
- POST `/reservations` — create from admin (staff)

Public controller at `public/:slug/reservations`:
- POST `/public/:slug/reservations` — customer creates reservation request

**Step 4: Emit RESERVATION_NEW WebSocket event on creation**

**Step 5: Commit**
```bash
git add apps/api/src/modules/reservation/ apps/api/src/app.module.ts
git commit -m "feat: create Reservation module with public and admin endpoints"
```

---

### Task 7: Create FloorPlan module

**Files:**
- Create: `apps/api/src/modules/floor-plan/entities/floor-plan.entity.ts`
- Create: `apps/api/src/modules/floor-plan/dto/`
- Create: `apps/api/src/modules/floor-plan/floor-plan.service.ts`
- Create: `apps/api/src/modules/floor-plan/floor-plan.controller.ts`
- Create: `apps/api/src/modules/floor-plan/floor-plan.module.ts`

**Step 1: Create FloorPlan entity**

```typescript
@Entity('floor_plans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  layout: Array<{
    table_id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rectangle' | 'circle';
    rotation: number;
  }>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Step 2: CRUD service** — create, findByTenant, update (including layout), delete

**Step 3: Controller at `floor-plans/`** — standard CRUD

**Step 4: Commit**
```bash
git add apps/api/src/modules/floor-plan/ apps/api/src/app.module.ts
git commit -m "feat: create FloorPlan module with layout JSONB storage"
```

---

### Task 8: Update seed with new modules and plan assignments

**Files:**
- Modify: `apps/api/src/database/seeds/run-seed.ts`

**Step 1: Add new system modules to defaultModules array**

```typescript
{ key: 'pickup', name: 'Retirada', description: 'Pedidos para retirada no balcao' },
{ key: 'dine_in', name: 'Atendimento Presencial', description: 'Mesas, comandas, reservas e mapa do salao' },
```

**Step 2: Update plan module assignments**

- Basico: add `'pickup'`
- Pro: add `'pickup'`
- Enterprise: add `'pickup'`, `'dine_in'`

**Step 3: Add new permissions**

```typescript
tables: [
  { key: 'table:create', name: 'Criar Mesa' },
  { key: 'table:read', name: 'Ver Mesas' },
  { key: 'table:update', name: 'Editar Mesa' },
  { key: 'table:delete', name: 'Remover Mesa' },
],
reservations: [
  { key: 'reservation:read', name: 'Ver Reservas' },
  { key: 'reservation:update', name: 'Gerenciar Reservas' },
],
floor_plan: [
  { key: 'floor_plan:read', name: 'Ver Mapa do Salao' },
  { key: 'floor_plan:update', name: 'Editar Mapa do Salao' },
],
```

**Step 4: Add order_modes to demo tenants**

- Burger House (Basico): `{ delivery: true, pickup: true, dine_in: false }`
- Pizza Express (Pro): `{ delivery: true, pickup: true, dine_in: false }`
- Sushi Premium (Enterprise): `{ delivery: true, pickup: true, dine_in: true }`

**Step 5: Add demo tables for Sushi Premium (Enterprise)**

```typescript
// After delivery zones, add tables for Enterprise tenant
if (demo.tenant.slug === 'sushi-premium') {
  const tableRepo = dataSource.getRepository('RestaurantTable');
  const existingTables = await tableRepo.find({ where: { tenant_id: tenantId } });
  if (existingTables.length === 0) {
    const tables = [
      { number: 1, label: 'Salao A', capacity: 2, tenant_id: tenantId },
      { number: 2, label: 'Salao A', capacity: 4, tenant_id: tenantId },
      { number: 3, label: 'Salao A', capacity: 4, tenant_id: tenantId },
      { number: 4, label: 'Salao A', capacity: 6, tenant_id: tenantId },
      { number: 5, label: 'Varanda', capacity: 2, tenant_id: tenantId },
      { number: 6, label: 'Varanda', capacity: 4, tenant_id: tenantId },
      { number: 7, label: 'Reservado', capacity: 8, tenant_id: tenantId },
      { number: 8, label: 'Bar', capacity: 2, tenant_id: tenantId },
    ];
    for (const t of tables) {
      await tableRepo.save(t);
    }
    console.log(`  ✅ 8 tables created for Sushi Premium`);
  }
}
```

**Step 6: Commit**
```bash
git add apps/api/src/database/seeds/
git commit -m "feat: add pickup/dine_in modules, permissions, and demo tables to seed"
```

---

## Phase 2: Frontend - Admin Panel

### Task 9: Add admin API endpoints for new modules

**Files:**
- Modify: `apps/web/src/api/adminApi.ts`

**Step 1: Add RTK Query endpoints**

```typescript
// Tables
getTables: builder.query({ query: () => 'tables', providesTags: ['Tables'] }),
createTable: builder.mutation({ query: (data) => ({ url: 'tables', method: 'POST', body: data }), invalidatesTags: ['Tables'] }),
updateTable: builder.mutation({ query: ({ id, ...data }) => ({ url: `tables/${id}`, method: 'PATCH', body: data }), invalidatesTags: ['Tables'] }),
deleteTable: builder.mutation({ query: (id) => ({ url: `tables/${id}`, method: 'DELETE' }), invalidatesTags: ['Tables'] }),
updateTableStatus: builder.mutation({ query: ({ id, status }) => ({ url: `tables/${id}/status`, method: 'PATCH', body: { status } }), invalidatesTags: ['Tables'] }),

// Table Sessions
openTableSession: builder.mutation({ query: (data) => ({ url: 'table-sessions/open', method: 'POST', body: data }), invalidatesTags: ['Tables', 'TableSessions'] }),
closeTableSession: builder.mutation({ query: (id) => ({ url: `table-sessions/${id}/close`, method: 'POST' }), invalidatesTags: ['Tables', 'TableSessions'] }),
getTableSession: builder.query({ query: (id) => `table-sessions/${id}`, providesTags: ['TableSessions'] }),
getActiveTableSession: builder.query({ query: (tableId) => `table-sessions/active/${tableId}`, providesTags: ['TableSessions'] }),
transferTableSession: builder.mutation({ query: ({ id, newTableId }) => ({ url: `table-sessions/${id}/transfer`, method: 'POST', body: { table_id: newTableId } }), invalidatesTags: ['Tables', 'TableSessions'] }),
getSessionBill: builder.query({ query: (id) => `table-sessions/${id}/bill`, providesTags: ['TableSessions'] }),

// Reservations
getReservations: builder.query({ query: (params) => ({ url: 'reservations', params }), providesTags: ['Reservations'] }),
updateReservationStatus: builder.mutation({ query: ({ id, status }) => ({ url: `reservations/${id}/status`, method: 'PATCH', body: { status } }), invalidatesTags: ['Reservations'] }),
createReservation: builder.mutation({ query: (data) => ({ url: 'reservations', method: 'POST', body: data }), invalidatesTags: ['Reservations'] }),

// Floor Plans
getFloorPlans: builder.query({ query: () => 'floor-plans', providesTags: ['FloorPlans'] }),
createFloorPlan: builder.mutation({ query: (data) => ({ url: 'floor-plans', method: 'POST', body: data }), invalidatesTags: ['FloorPlans'] }),
updateFloorPlan: builder.mutation({ query: ({ id, ...data }) => ({ url: `floor-plans/${id}`, method: 'PATCH', body: data }), invalidatesTags: ['FloorPlans'] }),
```

**Step 2: Add tag types** `'Tables'`, `'TableSessions'`, `'Reservations'`, `'FloorPlans'`

**Step 3: Commit**
```bash
git add apps/web/src/api/adminApi.ts
git commit -m "feat: add RTK Query endpoints for tables, sessions, reservations, floor plans"
```

---

### Task 10: Admin - Table Management page

**Files:**
- Create: `apps/web/src/pages/admin/tables/TableList.tsx`
- Create: `apps/web/src/pages/admin/tables/TableForm.tsx`
- Modify: router to add routes
- Modify: `apps/web/src/components/layout/AdminLayout.tsx` (add sidebar item)

Create page with:
- List of tables with number, label, capacity, status (color-coded badge), active toggle
- Create/edit form (number, label, capacity)
- QR code generation button (individual) and "Imprimir Todos" button for batch print
- QR code print layout: table number + QR code pointing to `/{slug}/mesa/{number}`
- Delete with confirmation
- Use existing UI components (PageHeader, Card, Table, Badge, Button, Modal, FormCard, FormField)
- Include dark: variants on all elements

**Commit:**
```bash
git commit -m "feat: add admin table management page with QR code generation"
```

---

### Task 11: Admin - Floor Plan Editor page

**Files:**
- Create: `apps/web/src/pages/admin/tables/FloorPlanEditor.tsx`

Create page with:
- Canvas area with draggable table elements (use HTML5 drag or a simple div-based approach)
- Tables rendered as colored shapes (rectangle/circle) based on status
- Real-time status colors: green=available, red=occupied, yellow=reserved, gray=maintenance
- Click table -> show popover with: session info, orders, open/close table, view bill
- Save layout button (persists positions to FloorPlan entity)
- Floor plan name selector (if multiple plans exist)
- Use `useGetTablesQuery` for real-time table data
- Use WebSocket for live status updates

**Commit:**
```bash
git commit -m "feat: add floor plan visual editor with drag-and-drop tables"
```

---

### Task 12: Admin - Reservation Management page

**Files:**
- Create: `apps/web/src/pages/admin/reservations/ReservationList.tsx`

Create page with:
- List of reservations with date filter, status filter tabs
- Each reservation shows: customer name, phone, party size, date/time, status badge, table (if assigned)
- Actions: Confirm, Cancel, Complete (opens session), No-show
- Create reservation form (for staff-created reservations)
- Use existing UI components with dark: variants

**Commit:**
```bash
git commit -m "feat: add admin reservation management page"
```

---

### Task 13: Admin - Settings order modes tab

**Files:**
- Modify: `apps/web/src/pages/admin/Settings.tsx`

**Step 1: Add "Modos de Pedido" tab to SETTINGS_TABS**

```typescript
{ key: 'modos', label: 'Modos de Pedido' },
```

**Step 2: Add tab content**

Show toggles for each order mode:
- Delivery (toggle, with note about delivery zones)
- Retirada no Balcao (toggle)
- Consumo no Local (toggle, gated by plan — show "Disponivel no plano Enterprise" if not in modules)

Each toggle calls `updateTenant` with updated `order_modes`.

**Step 3: Commit**
```bash
git commit -m "feat: add order modes tab to admin settings"
```

---

### Task 14: Admin - Sidebar navigation for dine-in

**Files:**
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`
- Modify: router file (add routes)

**Step 1: Add sidebar group for dine-in module**

Under module `dine_in`:
- Mesas (`/admin/tables`) — icon: `LayoutGrid`
- Mapa do Salao (`/admin/floor-plan`) — icon: `Map`
- Reservas (`/admin/reservations`) — icon: `CalendarCheck`

**Step 2: Add routes**

```typescript
{ path: 'tables', element: <TableList /> },
{ path: 'tables/new', element: <TableForm /> },
{ path: 'tables/:id/edit', element: <TableForm /> },
{ path: 'floor-plan', element: <FloorPlanEditor /> },
{ path: 'reservations', element: <ReservationList /> },
```

**Step 3: Commit**
```bash
git commit -m "feat: add dine-in sidebar navigation and routes"
```

---

## Phase 3: Frontend - Storefront

### Task 15: Storefront - Order mode selection in Checkout

**Files:**
- Modify: `apps/web/src/pages/storefront/Checkout.tsx`
- Modify: `apps/web/src/store/slices/cartSlice.ts`

**Step 1: Add orderType to cart state**

In cartSlice, add `orderType: 'delivery' | 'pickup' | 'dine_in'` to state, default `'delivery'`. Add `setOrderType` action.

**Step 2: Add mode selection step to Checkout**

Before address section, show "Como deseja receber?" with cards:
- Delivery icon (Truck) — "Entrega" — only if tenant order_modes.delivery
- Pickup icon (ShoppingBag) — "Retirada no Balcao" — only if tenant order_modes.pickup
- Dine-in icon (UtensilsCrossed) — "Consumo no Local" — only if tenant order_modes.dine_in AND came from table QR

If only one mode is available, auto-select it and skip the step.

**Step 3: Conditionally show/hide address section**

- Delivery: show address section (current behavior)
- Pickup: hide address section, show "Retire seu pedido em: {tenant.address}"
- Dine-in: hide address, show "Mesa {tableNumber}"

**Step 4: Pass order_type in createOrder mutation**

Add `order_type`, `table_id`, `table_session_id` to the order payload.

**Step 5: Set delivery_fee = 0 for pickup/dine-in**

**Step 6: Commit**
```bash
git commit -m "feat: add order mode selection to storefront checkout"
```

---

### Task 16: Storefront - Table QR code landing (dine-in flow)

**Files:**
- Create: `apps/web/src/pages/storefront/TableLanding.tsx`
- Modify: router

**Step 1: Create route** `/:slug/mesa/:tableNumber`

**Step 2: Create TableLanding page**

- Fetches table info from public API
- If table has active session, join it; otherwise show "Bem-vindo a mesa {number}"
- Optional login (for loyalty points)
- "Ver Cardapio" button -> navigates to menu with `tableId` and `tableSessionId` in context (URL params or Redux state)
- Cart automatically sets `orderType = 'dine_in'`

**Step 3: Commit**
```bash
git commit -m "feat: add table QR code landing page for dine-in flow"
```

---

### Task 17: Storefront - Reservation request page

**Files:**
- Create: `apps/web/src/pages/storefront/ReservationRequest.tsx`
- Modify: `apps/web/src/api/customerApi.ts` (add public reservation endpoint)
- Modify: router

**Step 1: Add public API endpoint**

In customerApi, add:
```typescript
createPublicReservation: builder.mutation({
  query: ({ slug, ...data }) => ({
    url: `public/${slug}/reservations`,
    method: 'POST',
    body: data,
  }),
}),
```

**Step 2: Create ReservationRequest page at `/:slug/reservar`**

Form with:
- Nome, Telefone, Quantidade de pessoas, Data, Horario, Observacoes
- Submit -> shows success message "Sua reserva foi enviada! Aguarde a confirmacao do restaurante."
- Use tenant-primary colors

**Step 3: Add link to storefront menu/header if dine_in mode is active**

**Step 4: Commit**
```bash
git commit -m "feat: add public reservation request page for storefront"
```

---

## Phase 4: Landing Page & Super Admin

### Task 18: Update Landing Page with new features

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

**Step 1: Add new features to the features grid**

Add these to the existing 16 features:
```typescript
{ icon: ShoppingBag, title: 'Retirada no Balcao', description: 'Clientes pedem online e retiram no local, sem taxa de entrega' },
{ icon: UtensilsCrossed, title: 'Atendimento Presencial', description: 'Mesas com QR code, comanda digital e divisao de conta' },
{ icon: CalendarCheck, title: 'Reserva de Mesa', description: 'Clientes solicitam reserva online, restaurante aprova' },
{ icon: Map, title: 'Mapa do Salao', description: 'Visualize suas mesas em tempo real com layout interativo' },
```

**Step 2: Update hero subtitle if desired**

Change from "O sistema de delivery que vende sozinho" to "O sistema completo para delivery, retirada e atendimento presencial"

**Step 3: Commit**
```bash
git commit -m "feat: add pickup and dine-in features to landing page"
```

---

### Task 19: Update Super Admin with new modules

**Files:**
- Modify: `apps/super-admin/src/pages/plans/PlanForm.tsx` (if module list is hardcoded)
- Modify: `apps/super-admin/src/pages/system-modules/SystemModuleList.tsx` (if needed)

The super-admin already has a SystemModules CRUD and Plans page that lists modules dynamically. After running seed (Task 8), the new `pickup` and `dine_in` modules will appear automatically.

**Step 1: Verify super-admin displays new modules correctly**

Read the plan form to check if it fetches modules dynamically from the API. If so, no changes needed.

**Step 2: If module descriptions or icons are hardcoded in super-admin, add the new ones**

**Step 3: Commit (if changes were made)**
```bash
git commit -m "feat: ensure super-admin displays new pickup and dine_in modules"
```

---

### Task 20: Add public table and tenant order_modes endpoints

**Files:**
- Modify: `apps/api/src/modules/tenant/tenant.controller.ts` (or public controller)
- Create public endpoint for table info

**Step 1: Ensure public tenant endpoint returns order_modes**

The `GET /public/:slug` endpoint should already return all tenant fields. Verify `order_modes` is included.

**Step 2: Create public table endpoint**

`GET /public/:slug/tables/:number` — returns table info (number, label, capacity, status) for QR code landing.

`POST /public/:slug/table-sessions/join` — joins or creates session for a table (used by customer scanning QR).

**Step 3: Commit**
```bash
git commit -m "feat: add public endpoints for table info and session join"
```

---

## Phase 5: WebSocket & Real-time

### Task 21: Add table real-time updates via WebSocket

**Files:**
- Modify: `apps/api/src/websocket/events.gateway.ts`
- Modify: `apps/web/src/hooks/useOrderNotifications.ts`

**Step 1: Add table status emit to EventsGateway**

```typescript
emitTableStatusUpdate(tenantId: string, tableId: string, status: string) {
  this.server.to(`tenant:${tenantId}:tables`).emit('table:status-updated', { tableId, status });
}
```

**Step 2: Call emitTableStatusUpdate from TableService and TableSessionService when status changes**

**Step 3: In admin floor plan page, listen for `table:status-updated` events to refresh table statuses in real-time**

**Step 4: Commit**
```bash
git commit -m "feat: add real-time table status updates via WebSocket"
```

---

### Task 22: Final integration and run seed

**Step 1: Run seed to create new modules and update plans**
```bash
cd apps/api && pnpm run seed
```

**Step 2: Build and verify**
```bash
pnpm --filter web build
pnpm --filter super-admin build
```

**Step 3: Manual smoke test checklist:**
- [ ] Admin Settings shows "Modos de Pedido" tab
- [ ] Admin can toggle delivery/pickup/dine-in modes
- [ ] Admin Tables page shows CRUD for tables
- [ ] QR code generation works and prints
- [ ] Floor Plan editor loads and tables are draggable
- [ ] Reservation list shows with status filters
- [ ] Storefront checkout shows mode selection
- [ ] Table QR code landing page works
- [ ] Public reservation form submits
- [ ] Landing page shows new features
- [ ] Super admin shows new modules in plans

**Step 4: Final commit**
```bash
git commit -m "feat: complete order modes and dine-in module integration"
```
