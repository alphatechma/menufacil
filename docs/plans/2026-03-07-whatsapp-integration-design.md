# WhatsApp Integration (Evolution API) - Design Document

## Overview

Integrate WhatsApp messaging into MenuFacil via the Evolution API (self-hosted on Easypanel). Each tenant connects one WhatsApp number. The system supports automatic transactional messages, welcome messages, marketing broadcasts with opt-in, custom templates, and a mini chat for staff to reply to customers.

## Architecture

```
Frontend                    MenuFacil API                Evolution API
+-----------------+         +------------------+         +--------------+
| Settings (tab)  |-------->| WhatsappModule   |-------->|              |
| /admin/whatsapp |-------->|  - Instance      |<--------|  Webhooks    |
|                 |<--ws----|  - Templates     |         |              |
|                 |         |  - Messages      |         |              |
+-----------------+         +------------------+         +--------------+
```

- **Global API key**: One Evolution API key manages all tenant instances.
- **No plan gating**: All tenants have access to WhatsApp features.
- **Instance per tenant**: Instance name derived from tenant slug.

## Backend (apps/api)

### New Module: `whatsapp`

Location: `apps/api/src/modules/whatsapp/`

#### Entities

**WhatsappInstance**

| Field          | Type     | Notes                                    |
|----------------|----------|------------------------------------------|
| id             | uuid     | PK                                       |
| tenant_id      | uuid     | FK -> tenant, unique                     |
| instance_name  | string   | Derived from tenant slug                 |
| status         | enum     | disconnected, connecting, connected      |
| phone_number   | string   | Nullable, populated after connection     |
| created_at     | datetime |                                          |
| updated_at     | datetime |                                          |

**WhatsappMessageTemplate**

| Field      | Type     | Notes                                                    |
|------------|----------|----------------------------------------------------------|
| id         | uuid     | PK                                                       |
| tenant_id  | uuid     | FK -> tenant                                             |
| name       | string   | Human-readable name                                      |
| type       | enum     | welcome, order_confirmed, order_preparing, order_ready, order_out_for_delivery, order_delivered, order_cancelled, marketing, custom |
| content    | text     | Supports placeholders: {{customer_name}}, {{order_number}}, {{storefront_url}}, {{total}}, {{order_type}} |
| is_active  | boolean  | Default true                                             |
| created_at | datetime |                                                          |
| updated_at | datetime |                                                          |

**WhatsappMessage**

| Field          | Type     | Notes                                  |
|----------------|----------|----------------------------------------|
| id             | uuid     | PK                                     |
| tenant_id      | uuid     | FK -> tenant                           |
| customer_phone | string   | Phone number (with country code)       |
| direction      | enum     | inbound, outbound                      |
| content        | text     | Message body                           |
| status         | enum     | sent, delivered, read, failed          |
| template_id    | uuid     | Nullable FK -> template                |
| order_id       | uuid     | Nullable FK -> order                   |
| created_at     | datetime |                                        |

#### Services

**EvolutionApiService** (external API client)
- `createInstance(instanceName)` — POST /instance/create
- `connectInstance(instanceName)` — GET /instance/connect/{instance} (returns QR code)
- `deleteInstance(instanceName)` — DELETE /instance/delete/{instance}
- `getInstanceStatus(instanceName)` — GET /instance/connectionState/{instance}
- `sendTextMessage(instanceName, phone, text)` — POST /message/sendText/{instance}
- `setWebhook(instanceName, webhookUrl)` — POST /webhook/set/{instance}

**WhatsappInstanceService**
- `connect(tenantId)` — Creates instance in Evolution API, sets webhook, returns QR code
- `disconnect(tenantId)` — Deletes instance in Evolution API, updates status
- `getStatus(tenantId)` — Returns current connection status + phone number
- `handleConnectionUpdate(instanceName, status)` — Called by webhook, updates DB

**WhatsappTemplateService**
- `findAll(tenantId)` — List templates
- `findOne(tenantId, id)` — Get template
- `create(tenantId, dto)` — Create template
- `update(tenantId, id, dto)` — Update template
- `delete(tenantId, id)` — Delete template
- `seedDefaults(tenantId)` — Create default templates for a tenant on first access
- `renderTemplate(template, variables)` — Replace placeholders with values

**WhatsappMessageService**
- `sendOrderNotification(order, templateType)` — Render template + send via Evolution API + save to DB
- `sendFreeMessage(tenantId, phone, content)` — Send free-form message from mini chat
- `handleIncomingMessage(instanceName, phone, content)` — Process webhook, auto-reply if needed, save to DB
- `getConversations(tenantId)` — List conversations grouped by phone
- `getMessages(tenantId, phone)` — Get message history for a phone number

#### Controller Endpoints

```
POST   /whatsapp/instance/connect      — Connect WhatsApp (creates instance, returns QR)
POST   /whatsapp/instance/disconnect   — Disconnect WhatsApp
GET    /whatsapp/instance/status       — Get connection status

GET    /whatsapp/templates             — List templates
POST   /whatsapp/templates             — Create template
PUT    /whatsapp/templates/:id         — Update template
DELETE /whatsapp/templates/:id         — Delete template

GET    /whatsapp/conversations         — List conversations
GET    /whatsapp/conversations/:phone  — Get messages for a phone
POST   /whatsapp/messages/send         — Send free-form message (mini chat)

POST   /whatsapp/webhook               — Evolution API webhook (public, no auth)
```

#### Webhook Handler

The Evolution API sends events to `POST /whatsapp/webhook`. Key events:
- `connection.update` — Status changes (connected/disconnected) → update WhatsappInstance
- `messages.upsert` — Incoming message → auto-reply with welcome template if no recent conversation, save to DB, broadcast via WebSocket to admin panel
- `messages.update` — Status updates (delivered, read) → update WhatsappMessage status

#### Order Integration

In `OrderService`, after status transitions, emit an event that `WhatsappMessageService` listens to:
- `order.confirmed` → send `order_confirmed` template
- `order.preparing` → send `order_preparing` template
- `order.ready` → send `order_ready` template
- `order.out_for_delivery` → send `order_out_for_delivery` template
- `order.delivered` → send `order_delivered` template
- `order.cancelled` → send `order_cancelled` template

Only sends if: instance is connected + template exists and is active + customer has phone number.

### Environment Variables

```env
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=<global-api-key>
EVOLUTION_WEBHOOK_URL=https://menufacil.maistechtecnologia.com.br/api/whatsapp/webhook
```

## Frontend (apps/web)

### Settings Tab — "WhatsApp"

Location: New tab in `apps/web/src/pages/admin/Settings.tsx`

Content:
- Connection status indicator (green/red dot + text)
- Connected phone number display
- QR Code display (when connecting, polls every 3s until connected)
- "Conectar WhatsApp" / "Desconectar" button
- Link to "Gerenciar Templates e Conversas" → navigates to /admin/whatsapp

### WhatsApp Page — `/admin/whatsapp`

Location: `apps/web/src/pages/admin/whatsapp/`

**Sub-tabs:**

1. **Conversas** (default)
   - Left panel: list of conversations (phone, last message preview, timestamp)
   - Right panel: message history for selected conversation
   - Input field + send button at bottom
   - Real-time updates via WebSocket (EventsGateway)

2. **Templates**
   - Table: name, type (badge), content preview, active toggle, actions (edit/delete)
   - "Novo Template" button opens modal/form
   - Form fields: name, type (select), content (textarea with placeholder hints), active toggle
   - Preview section showing rendered template with example values

### RTK Query Endpoints

Add to `adminApi.ts`:
- `connectWhatsapp` — POST /whatsapp/instance/connect
- `disconnectWhatsapp` — POST /whatsapp/instance/disconnect
- `getWhatsappStatus` — GET /whatsapp/instance/status
- `getWhatsappTemplates` — GET /whatsapp/templates
- `createWhatsappTemplate` — POST /whatsapp/templates
- `updateWhatsappTemplate` — PUT /whatsapp/templates/:id
- `deleteWhatsappTemplate` — DELETE /whatsapp/templates/:id
- `getWhatsappConversations` — GET /whatsapp/conversations
- `getWhatsappMessages` — GET /whatsapp/conversations/:phone
- `sendWhatsappMessage` — POST /whatsapp/messages/send

### Sidebar Entry

Add "WhatsApp" item to admin sidebar under a communication/messaging group.
Icon: `MessageCircle` from lucide-react.

## Default Templates (Seed)

Created automatically on first access per tenant:

| Type                   | Name                    | Content                                                                                   |
|------------------------|-------------------------|-------------------------------------------------------------------------------------------|
| welcome                | Boas-vindas             | Ola {{customer_name}}! Bem-vindo ao nosso cardapio digital. Faca seu pedido: {{storefront_url}} |
| order_confirmed        | Pedido Confirmado       | {{customer_name}}, seu pedido #{{order_number}} foi confirmado! Valor: R$ {{total}}        |
| order_preparing        | Pedido em Preparo       | {{customer_name}}, seu pedido #{{order_number}} esta sendo preparado!                      |
| order_ready            | Pedido Pronto           | {{customer_name}}, seu pedido #{{order_number}} esta pronto!                               |
| order_out_for_delivery | Saiu para Entrega       | {{customer_name}}, seu pedido #{{order_number}} saiu para entrega!                         |
| order_delivered        | Pedido Entregue         | {{customer_name}}, seu pedido #{{order_number}} foi entregue! Obrigado pela preferencia!   |
| order_cancelled        | Pedido Cancelado        | {{customer_name}}, seu pedido #{{order_number}} foi cancelado.                             |

## Permissions

New permissions to add to the seed:
- `whatsapp:manage` — Connect/disconnect instance, manage templates
- `whatsapp:chat` — View conversations and send messages

## Non-Goals (Out of Scope)

- Media messages (images, audio, video) — text only for v1
- Multiple numbers per tenant
- WhatsApp Business API (official) — using Evolution API (unofficial)
- Chatbot/AI auto-responses beyond template-based replies
