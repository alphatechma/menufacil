# Design: Modos de Pedido + Modulo Dine-in

**Data:** 2026-03-06
**Status:** Aprovado

## Resumo

Adicionar 3 modos de pedido (delivery, retirada, consumo no local) como feature flags por tenant. Criar modulo completo de atendimento presencial (dine-in) com mesas, comanda digital, divisao de conta, reservas com aprovacao, e mapa visual do salao.

## 1. Modos de Pedido (Order Types)

### Enum `OrderType` (shared)
- `delivery` - Entrega
- `pickup` - Retirada no local
- `dine_in` - Consumo no local

### Configuracao no Tenant
Novo campo JSONB `order_modes` na entidade Tenant:
```json
{ "delivery": true, "pickup": true, "dine_in": true }
```
Admin ativa/desativa em Settings. Storefront mostra apenas modos ativos E permitidos pelo plano.

### Impacto na Order Entity
- Novo campo `order_type: OrderType` (default: `delivery`)
- Novo campo `table_id` (FK nullable para Table)
- Novo campo `table_session_id` (FK nullable para TableSession)

### Status Flows por Tipo
- **Delivery:** pending -> confirmed -> preparing -> ready -> out_for_delivery -> delivered
- **Pickup:** pending -> confirmed -> preparing -> ready -> picked_up
- **Dine-in:** pending -> confirmed -> preparing -> ready -> served

Novos valores no enum `OrderStatus`: `picked_up`, `served`.

## 2. Modulo Dine-in - Mesas

### Entidade `Table`
- `id`, `tenant_id`, `number` (int, unico por tenant), `label` (string opcional), `capacity` (int), `status` (enum: available/occupied/reserved/maintenance), `qr_code_url`, `is_active`, `sort_order`, timestamps

### Admin CRUD (`/admin/tables`)
- Cadastro: numero, label, capacidade
- QR code individual (URL: `/{slug}/mesa/{number}`)
- Impressao de QR codes (individual ou lote)
- Toggle ativo/inativo e status manual

## 3. Modulo Dine-in - Comanda Digital

### Entidade `TableSession`
- `id`, `tenant_id`, `table_id`, `status` (open/closed), `opened_at`, `closed_at`, `opened_by` (user_id nullable)

Mesa ocupada = session `open`. Multiplos orders vinculados a mesma session.

### Fluxo do Cliente (QR code)
1. Escaneia QR -> storefront com `table_id` no contexto
2. Login opcional (acumula fidelidade se identificado)
3. Faz pedido -> order_type=dine_in, table_id, table_session_id
4. Pode fazer multiplos pedidos na mesma session (comanda aberta)

### Fluxo do Garcom/Caixa
- Abrir mesa (cria session) -> fazer pedido pela mesa via admin
- Ver comanda completa (todos os pedidos da session)
- Transferir mesa (mover session para outra mesa)
- Juntar mesas (merge de sessions)
- Fechar conta (com opcao de divisao)

## 4. Divisao de Conta

Ao fechar uma `TableSession`, garcom/caixa escolhe:
- **Divisao igualitaria:** total / N pessoas
- **Divisao por consumo:** itens identificados vao para cada pessoa, itens anonimos entram no rateio

Gera N pagamentos parciais vinculados a session.

## 5. Reservas

### Entidade `Reservation`
- `id`, `tenant_id`, `table_id` (nullable), `customer_id` (nullable), `customer_name`, `customer_phone`, `party_size`, `date`, `time_start`, `time_end`, `status` (pending/confirmed/cancelled/completed/no_show), `notes`, timestamps

### Fluxos
- **Storefront:** cliente solicita reserva -> status `pending`
- **Admin:** staff aprova (`confirmed`) ou rejeita (`cancelled`)
- **Chegada:** staff marca `completed` (abre session na mesa)
- **No-show:** staff marca `no_show`

Notificacao de nova reserva no admin.

## 6. Mapa do Salao

### Entidade `FloorPlan`
- `id`, `tenant_id`, `name` (ex: "Salao Principal"), `layout` (JSONB: posicao x/y e dimensao de cada mesa)

### Editor Visual no Admin
- Canvas drag-and-drop com mesas cadastradas
- Mesas como retangulos/circulos posicionaveis
- Status visual em tempo real (verde=livre, vermelho=ocupada, amarelo=reservada, cinza=manutencao)
- Clique na mesa -> detalhes (session atual, pedidos, abrir/fechar)

## 7. Distribuicao nos Planos

| Modulo | Basico | Pro | Enterprise |
|--------|--------|-----|------------|
| delivery | sim | sim | sim |
| pickup | sim | sim | sim |
| dine_in | nao | nao | sim |

Novos system modules no seed: `pickup`, `dine_in`.

## 8. Checkout (Storefront)

Nova etapa antes do endereco: "Como deseja receber?"
- Cards com modos ativos do tenant
- Delivery -> fluxo atual (endereco + taxa)
- Retirada -> pula endereco, taxa = 0
- Dine-in -> so aparece se veio via QR da mesa (ou seleciona mesa)

## 9. Landing Page

Novas features:
- Retirada no Balcao
- Atendimento Presencial (mesas, QR code, comanda digital, divisao de conta)
- Reserva de Mesa (solicitacao online com aprovacao)
- Mapa do Salao (layout interativo em tempo real)

## 10. Super Admin

- Novos modulos `pickup` e `dine_in` no seed
- Enterprise inclui `dine_in`
- Basico e Pro incluem `pickup`
