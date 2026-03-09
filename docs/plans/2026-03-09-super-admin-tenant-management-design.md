# Super-Admin Tenant Management - Design Document

## Date: 2026-03-09

## Overview

Expand the super-admin panel with comprehensive tenant lifecycle management: creation with admin setup, password reset, session management, staff listing, impersonation, WhatsApp control, and soft delete.

## Features

### 1. Tenant Creation with Admin Setup

Update `POST /super-admin/tenants` to accept admin user fields. Create tenant + headquarters unit + admin user in a single transaction.

**Form sections:**
- Tenant: name (required), slug (auto-generated, required), phone, address, plan (required)
- Admin: name (required), email (required), password (required, min 6 chars)

### 2. Reset Admin Password

`PATCH /super-admin/tenants/:id/reset-password` with `{ new_password }`. Updates the admin user's password hash directly.

### 3. Session Management

Add `token_revoked_at` (timestamp, nullable) to User entity. On JWT validation, reject tokens with `iat < token_revoked_at`.

- `POST /super-admin/tenants/:id/revoke-all-sessions` — set `token_revoked_at = now()` on all tenant users
- `POST /super-admin/tenants/:id/users/:userId/revoke-session` — set on individual user

### 4. List Tenant Staff

`GET /super-admin/tenants/:id/users` — returns all users for the tenant with name, email, role, session status, created_at.

### 5. Impersonation

`POST /super-admin/tenants/:id/impersonate` — generates a short-lived access token (1h) for the tenant's admin user with `impersonated_by` claim. Returns `{ access_token, tenant_slug }`.

Frontend opens new tab: `/{slug}/admin?token={access_token}`. Web app detects token in URL, stores in Redux, shows impersonation banner. No refresh token issued.

### 6. WhatsApp Management

- `GET /super-admin/tenants/:id/whatsapp/status` — connection status and phone number
- `POST /super-admin/tenants/:id/whatsapp/reconnect` — trigger reconnection
- `POST /super-admin/tenants/:id/whatsapp/disconnect` — disconnect instance

### 7. Soft Delete

Add `deleted_at` (timestamp, nullable) to Tenant entity. Use TypeORM `@DeleteDateColumn`.

- `DELETE /super-admin/tenants/:id` — soft delete (requires slug confirmation)
- `PATCH /super-admin/tenants/:id/restore` — restore soft-deleted tenant
- Super-admin tenant list gains "Deleted" filter option

### UI Structure

TenantDetail page gets tabs:
- **Informações** — basic info, plan, status, actions (reset password, delete, impersonate)
- **Usuários** — staff list with session revoke actions
- **WhatsApp** — connection status and controls
