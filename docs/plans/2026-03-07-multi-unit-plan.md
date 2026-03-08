# Multi-Unit Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-unit (multi-branch) support so a single tenant can manage multiple physical locations with shared menu but independent operations.

**Architecture:** Opt-in feature gated to Pro+ plans. New `TenantUnit` entity. Eight existing entities gain nullable `unit_id` column. New `X-Unit-Id` header for request scoping. Frontend gets unit selector in admin header and storefront unit picker.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, React, Redux Toolkit, RTK Query, Tailwind CSS v4

---

### Task 1: Create TenantUnit Entity

**Files:**
- Create: `apps/api/src/modules/unit/entities/tenant-unit.entity.ts`

**Step 1: Create the entity file**

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('tenant_units')
@Unique(['tenant_id', 'slug'])
export class TenantUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  business_hours: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_headquarters: boolean;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{\"delivery\": true, \"pickup\": false, \"dine_in\": false}'" })
  order_modes: { delivery: boolean; pickup: boolean; dine_in: boolean };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Step 2: Add OneToMany relation on Tenant entity**

In `apps/api/src/modules/tenant/entities/tenant.entity.ts`:
- Import `TenantUnit`
- Add `@OneToMany(() => TenantUnit, (unit) => unit.tenant) units: TenantUnit[];`

**Step 3: Commit**

```bash
git add apps/api/src/modules/unit/entities/tenant-unit.entity.ts apps/api/src/modules/tenant/entities/tenant.entity.ts
git commit -m "feat(multi-unit): create TenantUnit entity"
```

---

### Task 2: Add nullable `unit_id` to 8 existing entities

**Files:**
- Modify: `apps/api/src/modules/order/entities/order.entity.ts`
- Modify: `apps/api/src/modules/delivery-zone/entities/delivery-zone.entity.ts`
- Modify: `apps/api/src/modules/delivery-person/entities/delivery-person.entity.ts`
- Modify: `apps/api/src/modules/table/entities/table.entity.ts`
- Modify: `apps/api/src/modules/floor-plan/entities/floor-plan.entity.ts`
- Modify: `apps/api/src/modules/reservation/entities/reservation.entity.ts`
- Modify: `apps/api/src/modules/user/entities/user.entity.ts`
- Modify: `apps/api/src/modules/whatsapp/entities/whatsapp-instance.entity.ts`

**Step 1: Add `unit_id` column and relation to each entity**

For each of the 8 entities, add:

```typescript
import { TenantUnit } from '../../unit/entities/tenant-unit.entity';

// Add column (after tenant_id):
@Column({ nullable: true })
unit_id: string;

// Add relation:
@ManyToOne(() => TenantUnit, { nullable: true })
@JoinColumn({ name: 'unit_id' })
unit: TenantUnit;
```

**Important:** Adjust the import path based on each entity's location. For example:
- `order.entity.ts` → `../../unit/entities/tenant-unit.entity`
- `delivery-zone.entity.ts` → `../../unit/entities/tenant-unit.entity`
- `user.entity.ts` → `../../unit/entities/tenant-unit.entity`
- etc.

All columns are `nullable: true` so existing data (with `unit_id = null`) keeps working.

**Step 2: Verify TypeORM sync works**

```bash
cd apps/api && npx ts-node -e "console.log('Entity imports OK')"
```

**Step 3: Commit**

```bash
git add apps/api/src/modules/*/entities/*.entity.ts
git commit -m "feat(multi-unit): add nullable unit_id to 8 entities"
```

---

### Task 3: Create Unit Module (DTOs, Service, Controller)

**Files:**
- Create: `apps/api/src/modules/unit/dto/create-unit.dto.ts`
- Create: `apps/api/src/modules/unit/dto/update-unit.dto.ts`
- Create: `apps/api/src/modules/unit/unit.service.ts`
- Create: `apps/api/src/modules/unit/unit.controller.ts`
- Create: `apps/api/src/modules/unit/unit.module.ts`

**Step 1: Create DTOs**

`create-unit.dto.ts`:
```typescript
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString() @IsOptional()
  address?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsObject() @IsOptional()
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @IsObject() @IsOptional()
  order_modes?: { delivery: boolean; pickup: boolean; dine_in: boolean };
}
```

`update-unit.dto.ts`:
```typescript
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateUnitDto {
  @IsString() @IsOptional()
  name?: string;

  @IsString() @IsOptional()
  slug?: string;

  @IsString() @IsOptional()
  address?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsObject() @IsOptional()
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @IsBoolean() @IsOptional()
  is_active?: boolean;

  @IsObject() @IsOptional()
  order_modes?: { delivery: boolean; pickup: boolean; dine_in: boolean };
}
```

**Step 2: Create Service**

`unit.service.ts`:
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUnit } from './entities/tenant-unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(TenantUnit)
    private readonly unitRepo: Repository<TenantUnit>,
  ) {}

  async findAll(tenantId: string): Promise<TenantUnit[]> {
    return this.unitRepo.find({
      where: { tenant_id: tenantId },
      order: { is_headquarters: 'DESC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TenantUnit> {
    const unit = await this.unitRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(tenantId: string, dto: CreateUnitDto): Promise<TenantUnit> {
    const existing = await this.unitRepo.findOne({ where: { tenant_id: tenantId, slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug already in use for this tenant');

    const count = await this.unitRepo.count({ where: { tenant_id: tenantId } });
    const unit = this.unitRepo.create({
      ...dto,
      tenant_id: tenantId,
      is_headquarters: count === 0, // first unit is headquarters
    });
    return this.unitRepo.save(unit);
  }

  async update(tenantId: string, id: string, dto: UpdateUnitDto): Promise<TenantUnit> {
    const unit = await this.findOne(tenantId, id);
    if (dto.slug && dto.slug !== unit.slug) {
      const existing = await this.unitRepo.findOne({ where: { tenant_id: tenantId, slug: dto.slug } });
      if (existing) throw new BadRequestException('Slug already in use for this tenant');
    }
    Object.assign(unit, dto);
    return this.unitRepo.save(unit);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const unit = await this.findOne(tenantId, id);
    unit.is_active = false;
    await this.unitRepo.save(unit);
  }

  async findActiveByTenant(tenantId: string): Promise<TenantUnit[]> {
    return this.unitRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { is_headquarters: 'DESC', name: 'ASC' },
    });
  }
}
```

**Step 3: Create Controller**

`unit.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('units')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @Permissions('unit:read')
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.unitService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('unit:read')
  findOne(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.unitService.findOne(tenantId, id);
  }

  @Post()
  @Permissions('unit:create')
  create(@CurrentTenant('id') tenantId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.create(tenantId, dto);
  }

  @Put(':id')
  @Permissions('unit:update')
  update(@CurrentTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('unit:delete')
  remove(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.unitService.remove(tenantId, id);
  }
}
```

**Step 4: Create Module**

`unit.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUnit } from './entities/tenant-unit.entity';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUnit])],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService],
})
export class UnitModule {}
```

**Step 5: Register in AppModule**

In `apps/api/src/app.module.ts`, add `UnitModule` to imports.

**Step 6: Commit**

```bash
git add apps/api/src/modules/unit/ apps/api/src/app.module.ts
git commit -m "feat(multi-unit): create Unit module with CRUD endpoints"
```

---

### Task 4: Add Public Units Endpoint for Storefront

**Files:**
- Modify: `apps/api/src/modules/unit/unit.controller.ts` (add public endpoint)
  OR
- Add a method in the existing tenant controller

**Step 1: Add public endpoint to UnitController**

Add a new method in `unit.controller.ts` that does NOT require auth:

```typescript
@Get('public/:tenantSlug')
async findPublicUnits(@Param('tenantSlug') tenantSlug: string) {
  // Need to inject TenantRepository or a TenantService to resolve slug -> tenantId
  // Then return active units
}
```

**Alternative (simpler):** Add a route in the existing tenant public endpoint or create a standalone public controller:

Create `apps/api/src/modules/unit/unit-public.controller.ts`:

```typescript
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { UnitService } from './unit.service';

@Controller('public/units')
export class UnitPublicController {
  constructor(
    private readonly unitService: UnitService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get(':tenantSlug')
  async findByTenantSlug(@Param('tenantSlug') slug: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug, is_active: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.unitService.findActiveByTenant(tenant.id);
  }
}
```

Register `UnitPublicController` in `UnitModule` controllers and import `TypeOrmModule.forFeature([Tenant])` in the module.

**Step 2: Commit**

```bash
git add apps/api/src/modules/unit/
git commit -m "feat(multi-unit): add public units endpoint for storefront"
```

---

### Task 5: Add `multi_unit` System Module and Permissions to Seed

**Files:**
- Modify: `apps/api/src/database/seeds/run-seed.ts`

**Step 1: Add `multi_unit` module to `defaultModules` array**

After the existing modules (around line 75), add:

```typescript
{ key: 'multi_unit', name: 'Multi-Unidade', description: 'Suporte a multiplas unidades/filiais' },
```

**Step 2: Add `multi_unit` to Pro and Enterprise plan `moduleKeys`**

- Pro plan `moduleKeys`: add `'multi_unit'`
- Enterprise plan `moduleKeys`: add `'multi_unit'`
- Basico plan: do NOT add it

**Step 3: Add unit permissions to `permissionsByModule`**

```typescript
multi_unit: [
  { key: 'unit:read', name: 'Ver Unidades' },
  { key: 'unit:create', name: 'Criar Unidade' },
  { key: 'unit:update', name: 'Editar Unidade' },
  { key: 'unit:delete', name: 'Remover Unidade' },
  { key: 'unit:manage', name: 'Gerenciar Unidades' },
],
```

**Step 4: Add `unit:read` and `unit:manage` to Administrador role, `unit:read` to Gerente role**

In the `defaultRoles` array, add to the Administrador `permissionKeys` — it already uses `allPermissions.map(p => p.key)` so it will automatically include new ones.

For Gerente, add `'unit:read'` to `permissionKeys`.

**Step 5: Commit**

```bash
git add apps/api/src/database/seeds/run-seed.ts
git commit -m "feat(multi-unit): add multi_unit module and permissions to seed"
```

---

### Task 6: Create Unit Context Middleware

**Files:**
- Create: `apps/api/src/common/middleware/unit.middleware.ts`
- Modify: `apps/api/src/app.module.ts` (register middleware)

**Step 1: Create the middleware**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class UnitMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const unitId = req.headers['x-unit-id'] as string;
    if (unitId) {
      (req as any).unitId = unitId;
    }
    next();
  }
}
```

**Step 2: Create a `CurrentUnit` decorator**

Create `apps/api/src/common/decorators/current-unit.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUnit = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.unitId || null;
  },
);
```

**Step 3: Register middleware in AppModule**

In `app.module.ts`, inside the `configure(consumer: MiddlewareConsumer)` method, add:

```typescript
consumer.apply(UnitMiddleware).forRoutes('*');
```

**Step 4: Commit**

```bash
git add apps/api/src/common/middleware/unit.middleware.ts apps/api/src/common/decorators/current-unit.decorator.ts apps/api/src/app.module.ts
git commit -m "feat(multi-unit): add Unit context middleware and decorator"
```

---

### Task 7: Update Unit-Scoped Services to Filter by `unit_id`

**Files:**
- Modify: `apps/api/src/modules/order/order.service.ts`
- Modify: services for delivery-zone, delivery-person, table, floor-plan, reservation (find their service files)

**Step 1: For each unit-scoped service, update query methods**

The pattern for each service's `findAll` or equivalent method:

```typescript
// Before:
const where: any = { tenant_id: tenantId };

// After:
const where: any = { tenant_id: tenantId };
if (unitId) {
  where.unit_id = unitId;
}
```

Also update `create` methods to accept and save `unit_id`:

```typescript
// In order creation, table creation, etc:
entity.unit_id = unitId || null;
```

**Step 2: Add `@CurrentUnit()` parameter to affected controller methods**

For each affected controller (orders, delivery-zones, delivery-persons, tables, floor-plans, reservations), add:

```typescript
import { CurrentUnit } from '../../common/decorators/current-unit.decorator';

// In each method:
@Get()
findAll(
  @CurrentTenant('id') tenantId: string,
  @CurrentUnit() unitId: string | null,
) {
  return this.service.findAll(tenantId, unitId);
}
```

**Step 3: Update WhatsappInstanceService**

In `apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts`:
- `connect()`, `disconnect()`, `getStatus()` methods should accept optional `unitId`
- When querying, filter by `unit_id` if provided
- Instance name pattern: `menufacil-${tenantSlug}` → `menufacil-${tenantSlug}-${unitSlug}` when unit exists

**Step 4: Commit**

```bash
git add apps/api/src/modules/
git commit -m "feat(multi-unit): filter unit-scoped services by unit_id"
```

---

### Task 8: Frontend - Add `selectedUnitId` to Redux State

**Files:**
- Modify: `apps/web/src/store/slices/uiSlice.ts`

**Step 1: Add `selectedUnitId` to UiState**

```typescript
interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  themeMode: ThemeMode;
  isDark: boolean;
  selectedUnitId: string | null; // NEW
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  themeMode,
  isDark: resolveIsDark(themeMode),
  selectedUnitId: null, // NEW
};
```

**Step 2: Add reducer and selector**

```typescript
// In reducers:
setSelectedUnit(state, action: PayloadAction<string | null>) {
  state.selectedUnitId = action.payload;
},

// Export:
export const selectSelectedUnitId = (state: RootState) => state.ui.selectedUnitId;
export const { ..., setSelectedUnit } = uiSlice.actions;
```

**Step 3: Commit**

```bash
git add apps/web/src/store/slices/uiSlice.ts
git commit -m "feat(multi-unit): add selectedUnitId to Redux UI state"
```

---

### Task 9: Frontend - Send `X-Unit-Id` Header in API Requests

**Files:**
- Modify: `apps/web/src/api/axiosBaseQuery.ts`

**Step 1: Add X-Unit-Id header for admin requests**

Inside the `axiosBaseQuery` function, after setting `X-Tenant-Slug` for admin context (around line 36), add:

```typescript
if (authContext === 'admin') {
  const { tenantSlug } = state.adminAuth;
  if (tenantSlug) {
    headers['X-Tenant-Slug'] = tenantSlug;
  }
  // NEW: send unit context
  const { selectedUnitId } = state.ui;
  if (selectedUnitId) {
    headers['X-Unit-Id'] = selectedUnitId;
  }
}
```

For customer context, read `selectedUnitId` from a different source (tenantSlice or localStorage):

```typescript
if (authContext === 'customer') {
  // ... existing code ...
  const customerUnitId = state.tenant.selectedUnitId;
  if (customerUnitId) {
    headers['X-Unit-Id'] = customerUnitId;
  }
}
```

**Step 2: Add `selectedUnitId` to tenantSlice**

In `apps/web/src/store/slices/tenantSlice.ts`, add:

```typescript
selectedUnitId: string | null; // in state
setSelectedUnitId(state, action) { state.selectedUnitId = action.payload; } // reducer
```

**Step 3: Commit**

```bash
git add apps/web/src/api/axiosBaseQuery.ts apps/web/src/store/slices/tenantSlice.ts
git commit -m "feat(multi-unit): send X-Unit-Id header in API requests"
```

---

### Task 10: Frontend - Add Unit CRUD API Endpoints

**Files:**
- Modify: `apps/web/src/api/baseApi.ts` (add cache tag)
- Modify: `apps/web/src/api/adminApi.ts` (add CRUD endpoints)

**Step 1: Add cache tag**

In `baseApi.ts`, add `'Units'` to the `tagTypes` array.

**Step 2: Add unit endpoints in adminApi**

```typescript
// Units CRUD
getUnits: builder.query<any[], void>({
  query: () => ({ url: '/units', method: 'GET', meta: { authContext: 'admin' } }),
  providesTags: ['Units'],
}),
getUnit: builder.query<any, string>({
  query: (id) => ({ url: `/units/${id}`, method: 'GET', meta: { authContext: 'admin' } }),
  providesTags: ['Units'],
}),
createUnit: builder.mutation<any, any>({
  query: (data) => ({ url: '/units', method: 'POST', data, meta: { authContext: 'admin' } }),
  invalidatesTags: ['Units'],
}),
updateUnit: builder.mutation<any, { id: string; data: any }>({
  query: ({ id, data }) => ({ url: `/units/${id}`, method: 'PUT', data, meta: { authContext: 'admin' } }),
  invalidatesTags: ['Units'],
}),
deleteUnit: builder.mutation<void, string>({
  query: (id) => ({ url: `/units/${id}`, method: 'DELETE', meta: { authContext: 'admin' } }),
  invalidatesTags: ['Units'],
}),
```

**Step 3: Export hooks**

```typescript
export const {
  useGetUnitsQuery,
  useGetUnitQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  // ... existing exports
} = adminApi;
```

**Step 4: Add public units endpoint in customerApi**

```typescript
getPublicUnits: builder.query<any[], string>({
  query: (tenantSlug) => ({ url: `/public/units/${tenantSlug}`, method: 'GET' }),
}),
```

**Step 5: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat(multi-unit): add Unit CRUD and public API endpoints"
```

---

### Task 11: Frontend - Unit Selector in Admin Header

**Files:**
- Create: `apps/web/src/components/layout/UnitSelector.tsx`
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

**Step 1: Create UnitSelector component**

```typescript
import { useGetUnitsQuery } from '@/api/adminApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedUnit, selectSelectedUnitId } from '@/store/slices/uiSlice';
import { usePermission } from '@/hooks/usePermission';
import { Building2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

export function UnitSelector() {
  const { hasModule } = usePermission();
  const { data: units } = useGetUnitsQuery(undefined, { skip: !hasModule('multi_unit') });
  const dispatch = useAppDispatch();
  const selectedUnitId = useAppSelector(selectSelectedUnitId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!units || units.length === 0) return null;

  const selected = units.find((u: any) => u.id === selectedUnitId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Building2 className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {selected ? selected.name : 'Todas as unidades'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
          <button
            onClick={() => { dispatch(setSelectedUnit(null)); setOpen(false); }}
            className={cn(
              'w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors',
              !selectedUnitId && 'bg-primary/5 text-primary font-medium',
            )}
          >
            Todas as unidades
          </button>
          {units.map((unit: any) => (
            <button
              key={unit.id}
              onClick={() => { dispatch(setSelectedUnit(unit.id)); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors',
                selectedUnitId === unit.id && 'bg-primary/5 text-primary font-medium',
              )}
            >
              <span>{unit.name}</span>
              {unit.is_headquarters && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">(Matriz)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add UnitSelector to AdminLayout header**

In `apps/web/src/components/layout/AdminLayout.tsx`, in the header section (around line 479), add `<UnitSelector />` before the storefront link:

```tsx
import { UnitSelector } from '@/components/layout/UnitSelector';

// In the header div.flex.items-center.gap-1:
<UnitSelector />
{tenantSlug && (
  <a href={`/${tenantSlug}`} ... >
```

**Step 3: Commit**

```bash
git add apps/web/src/components/layout/UnitSelector.tsx apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat(multi-unit): add unit selector dropdown in admin header"
```

---

### Task 12: Frontend - Units Management Page

**Files:**
- Create: `apps/web/src/pages/admin/units/UnitsList.tsx`
- Create: `apps/web/src/pages/admin/units/UnitForm.tsx`
- Modify: `apps/web/src/App.tsx` (add routes)
- Modify: `apps/web/src/components/layout/AdminLayout.tsx` (add sidebar item)

**Step 1: Create UnitsList page**

Standard admin list page with:
- `PageHeader` with title "Unidades" and "Nova Unidade" button
- Table with columns: name, slug, address, phone, status (Badge), is_headquarters badge
- Edit/delete actions
- Gated by `multi_unit` module

**Step 2: Create UnitForm page**

Form with:
- `name`, `slug` (auto-generated from name), `address`, `phone`
- `business_hours` JSON editor (reuse pattern from Settings page)
- `order_modes` toggles (delivery, pickup, dine_in)
- Uses `react-hook-form` + `zod`
- Handles both create and edit (check `:id` param)

**Step 3: Add routes in App.tsx**

```tsx
const UnitsList = lazy(() => import('./pages/admin/units/UnitsList'));
const UnitForm = lazy(() => import('./pages/admin/units/UnitForm'));

// Inside admin routes:
<Route path="units" element={<UnitsList />} />
<Route path="units/new" element={<UnitForm />} />
<Route path="units/:id" element={<UnitForm />} />
```

**Step 4: Add sidebar item in AdminLayout**

In the `admin` group (Administracao), add before Settings:

```typescript
{ to: '/admin/units', icon: Building2, label: 'Unidades', module: 'multi_unit', permission: 'unit:read' },
```

Import `Building2` from `lucide-react`.

**Step 5: Commit**

```bash
git add apps/web/src/pages/admin/units/ apps/web/src/App.tsx apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat(multi-unit): add Units management page and routes"
```

---

### Task 13: Frontend - Storefront Unit Selector

**Files:**
- Create: `apps/web/src/components/storefront/UnitSelectorModal.tsx`
- Modify: `apps/web/src/routes/TenantProvider.tsx`
- Modify: `apps/web/src/store/slices/tenantSlice.ts`

**Step 1: Create UnitSelectorModal**

A modal/full-page component shown when:
- Tenant has units (`units.length > 0`)
- No unit is selected in localStorage

Shows list of active units with name + address. On select, saves to Redux + localStorage.

```tsx
interface Props {
  units: any[];
  tenantSlug: string;
  onSelect: (unitId: string) => void;
}

export function UnitSelectorModal({ units, tenantSlug, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Selecione a unidade
        </h2>
        <div className="space-y-3">
          {units.map((unit: any) => (
            <button
              key={unit.id}
              onClick={() => onSelect(unit.id)}
              className="w-full text-left p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[var(--tenant-primary)] transition-all"
            >
              <p className="font-semibold text-gray-900">{unit.name}</p>
              {unit.address && <p className="text-sm text-gray-500 mt-1">{unit.address}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update TenantProvider**

In `TenantProvider.tsx`:
1. After fetching tenant, also fetch units via the public endpoint
2. If units exist and none selected, render `UnitSelectorModal` instead of `<Outlet />`
3. When unit is selected, store in Redux `tenantSlice.selectedUnitId` and localStorage
4. On mount, check localStorage for previously selected unit
5. Pass selected unit's `business_hours` to `computeStoreStatus()` instead of tenant's

**Step 3: Add selectedUnitId to tenantSlice** (if not already done in Task 9)

**Step 4: Commit**

```bash
git add apps/web/src/components/storefront/UnitSelectorModal.tsx apps/web/src/routes/TenantProvider.tsx apps/web/src/store/slices/tenantSlice.ts
git commit -m "feat(multi-unit): add storefront unit selector"
```

---

### Task 14: Update Storefront to Use Unit-Specific Data

**Files:**
- Modify: `apps/web/src/routes/TenantProvider.tsx` (use unit's business_hours/order_modes)
- Modify: Customer layout header (show unit name + change link)

**Step 1: Use unit business_hours for store status**

In `TenantProvider`, when a unit is selected:
- Use the unit's `business_hours` for `computeStoreStatus()` if available
- Use the unit's `order_modes` to override tenant's

**Step 2: Show unit name in customer header**

In `CustomerLayout` (or wherever the store header is), show:
- Unit name next to tenant name
- Small "Trocar unidade" link to re-open the unit selector

**Step 3: Commit**

```bash
git add apps/web/src/routes/TenantProvider.tsx apps/web/src/components/layout/CustomerLayout.tsx
git commit -m "feat(multi-unit): use unit-specific hours and modes in storefront"
```

---

### Task 15: Build Verification and Final Cleanup

**Files:**
- All modified files

**Step 1: Build API**

```bash
cd apps/api && npx nest build
```

Fix any TypeScript errors.

**Step 2: Build Web**

```bash
cd apps/web && npx vite build
```

Fix any TypeScript errors.

**Step 3: Run seed**

```bash
cd apps/api && npx ts-node src/database/seeds/run-seed.ts
```

Verify `multi_unit` module is created and assigned to Pro/Enterprise plans.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(multi-unit): resolve build errors and cleanup"
```

---

## Summary of All Tasks

| # | Task | Type |
|---|------|------|
| 1 | Create TenantUnit entity | Backend |
| 2 | Add nullable `unit_id` to 8 entities | Backend |
| 3 | Create Unit module (DTOs, Service, Controller) | Backend |
| 4 | Add public units endpoint for storefront | Backend |
| 5 | Add `multi_unit` module + permissions to seed | Backend |
| 6 | Create Unit context middleware + decorator | Backend |
| 7 | Update unit-scoped services to filter by `unit_id` | Backend |
| 8 | Add `selectedUnitId` to Redux UI state | Frontend |
| 9 | Send `X-Unit-Id` header in API requests | Frontend |
| 10 | Add Unit CRUD API endpoints (RTK Query) | Frontend |
| 11 | Unit selector in Admin header | Frontend |
| 12 | Units management page + routes + sidebar | Frontend |
| 13 | Storefront unit selector modal | Frontend |
| 14 | Use unit-specific data in storefront | Frontend |
| 15 | Build verification and final cleanup | Both |

## Dependencies

```
Task 1 → Task 2 → Task 3 → Task 4
Task 1 → Task 5
Task 1 → Task 6 → Task 7
Task 8 → Task 9 → Task 10 → Task 11
Task 10 → Task 12
Task 10 → Task 13 → Task 14
All → Task 15
```

Backend tasks (1-7) and frontend tasks (8-14) can run in parallel after Task 1 is complete (Task 2 creates the FK that frontend references).
