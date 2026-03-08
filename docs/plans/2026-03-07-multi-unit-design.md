# Multi-Unit Support - Design Document

## Overview

Add multi-unit (multi-branch) support to MenuFacil. A single tenant (restaurant) can have multiple physical units/branches that share the menu, customers, coupons, and loyalty, but have independent orders, delivery zones, staff, tables, and WhatsApp instances. This feature is opt-in and gated to Pro+ plans.

## Architecture

### Core Principle: Opt-in with nullable `unit_id`

Tenants without units continue working exactly as today. When a tenant creates units, entities that are "per unit" get a `unit_id`. When `unit_id = null`, the entity belongs to the tenant globally (backwards compatible).

## New Entity: TenantUnit

Location: `apps/api/src/modules/unit/entities/tenant-unit.entity.ts`

| Field          | Type     | Notes                                      |
|----------------|----------|--------------------------------------------|
| id             | uuid     | PK                                         |
| tenant_id      | uuid     | FK -> tenant                               |
| name           | string   | "Matriz", "Shopping Center", etc.          |
| slug           | string   | Unique within tenant (e.g., `centro`)      |
| address        | string   | Nullable                                   |
| phone          | string   | Nullable                                   |
| business_hours | jsonb    | Unit-specific hours                        |
| is_active      | boolean  | Default true                               |
| is_headquarters| boolean  | First unit = headquarters                  |
| order_modes    | jsonb    | delivery/pickup/dine_in per unit           |
| created_at     | datetime |                                            |
| updated_at     | datetime |                                            |

### Unique constraint: `(tenant_id, slug)`

## Entities Modified (gain nullable `unit_id`)

These entities get a new `unit_id` column (nullable UUID, FK -> tenant_units):

1. **Order** - Orders belong to a specific unit
2. **DeliveryZone** - Each unit has its own delivery zones
3. **DeliveryPerson** - Drivers assigned to a unit
4. **Table** - Tables are physical, per-unit
5. **FloorPlan** - Floor plans are per-unit
6. **Reservation** - Reservations are per-unit
7. **User** (staff) - Staff can be assigned to a unit (nullable = can see all)
8. **WhatsappInstance** - Each unit can have its own WhatsApp number

### Entities NOT modified (shared at tenant level)

- Category, Product, ExtraGroup (shared menu)
- Customer (belongs to tenant)
- Coupon, LoyaltyReward (shared promotions)
- WhatsappMessageTemplate (shared templates)
- Role, Permission (shared access control)

## Backend

### New Module: `unit`

Location: `apps/api/src/modules/unit/`

#### Endpoints

```
GET    /units              - List units for tenant
GET    /units/:id          - Get unit details
POST   /units              - Create unit
PUT    /units/:id          - Update unit
DELETE /units/:id          - Delete unit (soft: deactivate)
```

All endpoints gated by `multi_unit` module and `unit:manage` permission.

#### Unit Context Middleware

New optional header: `X-Unit-Id`

- If present, `req.unitId` is set
- Services that deal with unit-scoped entities filter by `unit_id` when `req.unitId` is set
- If tenant has units but no `X-Unit-Id` header on unit-scoped endpoints, return all units' data (for dashboard/consolidated views)

#### Service Pattern

For unit-scoped services (Order, DeliveryZone, Table, etc.), the query pattern becomes:

```typescript
const where: any = { tenant_id: tenantId };
if (unitId) {
  where.unit_id = unitId;
}
return this.repo.find({ where });
```

### Permissions

New permissions:
- `unit:read` - View units
- `unit:create` - Create units
- `unit:update` - Edit units
- `unit:delete` - Delete units
- `unit:manage` - Full unit management

### System Module

Add `multi_unit` to system modules seed. Include in Pro and Enterprise plans only.

## Frontend

### Admin Panel

#### Unit Selector (Header)

- Dropdown in AdminLayout header, only visible if tenant has units
- Stores selected `unitId` in Redux (`uiSlice`)
- Sends `X-Unit-Id` header with all admin API requests when set
- Option "Todas as unidades" for consolidated view (no X-Unit-Id)

#### Units Management Page (`/admin/units`)

- List of units with name, address, status
- Create/edit form with: name, slug, address, phone, business_hours, order_modes
- Gated by `multi_unit` module

#### Affected Pages

Pages that show unit-scoped data automatically filter by selected unit:
- Orders, KDS, Deliveries (operations)
- Tables, Floor Plan, Reservations (dine-in)
- Delivery Zones, Delivery Persons (delivery)
- Dashboard (consolidated or per-unit)
- Settings (unit-specific: address, phone, hours, WhatsApp)

Pages that are unaffected (tenant-level):
- Categories, Products (shared menu)
- Customers (shared)
- Coupons, Loyalty (shared)
- Staff (shows all, but can filter by unit)
- WhatsApp Templates (shared)

### Storefront

#### Unit Selection

When customer accesses `/{slug}`:
1. TenantProvider checks if tenant has units
2. If yes, shows unit selector (list of active units with name + address)
3. Selected unit stored in Redux + localStorage
4. All subsequent operations use that unit's context:
   - Business hours from unit
   - Delivery zones from unit
   - Tables from unit
   - Orders created with unit_id

#### Unit Selector Component

- Modal or full-page selector on first visit
- Small dropdown/link to change unit in CustomerLayout header
- Persisted in localStorage per tenant slug

### RTK Query Changes

- Add `X-Unit-Id` header to `axiosBaseQuery` when unitId is set in Redux
- New endpoints: CRUD for units
- Existing endpoints unchanged (backend handles filtering)

## Migration Strategy

1. Add `unit_id` nullable column to 8 entities
2. Create `tenant_units` table
3. All existing data has `unit_id = null` (works as before)
4. No data migration needed
5. TypeORM `synchronize: true` handles schema in dev

## Plan Gating

- Add `multi_unit` system module to seed
- Add to Pro plan modules: `multi_unit`
- Add to Enterprise plan modules: `multi_unit`
- Basico plan: does NOT include `multi_unit`

## Non-Goals (v1)

- Unit-specific pricing (same price across units)
- Unit-specific product availability (all units share full menu)
- Inter-unit transfers (orders/stock)
- Unit-level analytics/reports (future)
