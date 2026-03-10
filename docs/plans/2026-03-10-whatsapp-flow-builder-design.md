# WhatsApp Flow Builder — Design Document

## Objetivo

Construir um flow builder visual (estilo n8n) para automação de conversas WhatsApp. Permite que restaurantes criem fluxos condicionais de atendimento automatizado, marketing e engajamento.

## Abordagem

React Flow no frontend + Engine de execução com Bull Queue no backend. Redis (já existente) usado para filas e agendamentos.

---

## Modelo de Dados

### `whatsapp_flows`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid, PK | |
| tenant_id | uuid, FK | |
| name | string | Nome do fluxo |
| trigger_type | enum | `message_received`, `order_status_changed`, `scheduled`, `new_customer` |
| trigger_config | jsonb | Palavras-chave, horário, cron, status do pedido |
| nodes | jsonb | Array de nós do React Flow |
| edges | jsonb | Array de conexões do React Flow |
| is_active | boolean | |
| priority | int, default 0 | Maior prioridade ganha quando múltiplos fluxos matcham |
| created_at, updated_at | timestamp | |

### `whatsapp_flow_executions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid, PK | |
| flow_id | uuid, FK | |
| tenant_id | uuid, FK | |
| customer_phone | string | |
| status | enum | `running`, `waiting_input`, `completed`, `failed`, `cancelled` |
| current_node_id | string, nullable | Nó onde está parado (wait_input/delay) |
| context | jsonb | Variáveis acumuladas (respostas, dados consultados) |
| started_at, completed_at | timestamp | |
| created_at, updated_at | timestamp | |

---

## Tipos de Nós

| Tipo | Categoria | Dados (config) |
|------|-----------|----------------|
| `trigger` | Trigger | trigger_type, config |
| `send_message` | Ação | content (com {{variáveis}}) |
| `send_media` | Ação | media_url, caption |
| `send_menu_link` | Ação | (usa storefront_url automaticamente) |
| `wait_input` | Input | timeout_minutes, timeout_node_id |
| `delay` | Ação | minutes |
| `condition` | Lógica | field, operator (eq, neq, gt, lt, contains, not_contains), value |
| `check_hours` | Lógica | (sem config, avalia horário de funcionamento) |
| `check_customer` | Lógica | check_type (is_registered, has_recent_order, loyalty_points_gt) |
| `lookup_order` | Lógica | (busca último pedido, coloca no context) |
| `transfer_human` | Ação | (cancela fluxo, marca conversa como atendimento humano) |

---

## Engine de Execução (Backend)

### Fluxo

1. Trigger dispara (webhook, mudança de status, cron, novo cliente)
2. Engine busca fluxos ativos do tenant que matcham o trigger
3. Verifica prioridade — se já existe execução `running`/`waiting_input` para aquele phone, o fluxo ativo tem precedência (a não ser que o novo tenha prioridade maior)
4. Cria `whatsapp_flow_execution` com status `running`
5. Percorre o grafo a partir do nó trigger, seguindo as edges

### Processamento por tipo de nó

- **send_message / send_media / send_menu_link**: Renderiza variáveis, envia via Evolution API, avança
- **delay**: Cria Bull job com delay de X minutos. Quando executa, retoma do próximo nó
- **wait_input**: Salva `current_node_id`, muda status pra `waiting_input`. Nova mensagem do mesmo phone retoma dali (resposta vai pro `context.last_input`)
- **condition / check_hours / check_customer**: Avalia condição, segue pela edge `true` ou `false`
- **lookup_order**: Busca último pedido do cliente, coloca dados no `context`
- **transfer_human**: Muda execution pra `cancelled`, atendente assume

### Bull Queues

- **`flow-execution`**: processa nós, gerencia delays
- **`flow-scheduled`**: cron jobs pra triggers agendados (repeatable jobs)

### Regras de conflito

- Mensagem recebida primeiro checa se há execution `waiting_input` para aquele phone
- Se não, busca fluxos com trigger `message_received` que matcham
- Se nenhum fluxo matcha, mantém comportamento atual (welcome template)

---

## Frontend — Editor Visual

### Lista de fluxos (`/admin/whatsapp/flows`)

- Nome, trigger type badge, ativo/inativo toggle, última edição
- Ações: editar, duplicar, deletar
- Botão "Novo Fluxo"

### Editor (`/admin/whatsapp/flows/:id`)

- **React Flow** fullscreen (sem sidebar do admin)
- **Toolbar superior**: nome editável, Salvar, Voltar, toggle Ativo/Inativo
- **Painel lateral esquerdo**: paleta de nós arrastáveis por categoria
  - Triggers: Mensagem Recebida, Status do Pedido, Agendado, Novo Cliente
  - Ações: Enviar Mensagem, Enviar Mídia, Enviar Cardápio, Delay, Transferir p/ Atendente
  - Lógica: Condição, Verificar Horário, Verificar Cliente, Consultar Pedido
  - Input: Aguardar Resposta
- **Painel lateral direito**: configurações do nó selecionado (formulário contextual)
- **Nós customizados**: visual próprio por tipo
  - Trigger: azul, ícone de raio
  - Ações: verde, ícone contextual
  - Lógica: amarelo, ícone de bifurcação
  - Input: roxo, ícone de relógio

### Nó de condição

- 2 saídas: "Sim" (verde) e "Não" (vermelho)
- Config: dropdown do campo, dropdown do operador, input do valor
- Campos: `store_status`, `last_input`, `customer.is_registered`, `customer.loyalty_points`, `last_order.total`, `last_order.status`, `current_hour`, `current_day`

### Nó de mensagem

- Textarea com variáveis clicáveis ({{customer_name}}, {{store_name}}, etc.)
- Preview inline truncado no nó

### Validação ao salvar

- Exatamente 1 nó trigger
- Todos os nós conectados (sem órfãos)
- Condições com ambas saídas conectadas
- Wait_input com timeout configurado

---

## Integração com Planos

### Módulo

- Novo módulo `whatsapp_flows` na tabela de planos
- Aba "Fluxos" só aparece se tenant tem o módulo

### Limites por plano (`flow_limits` jsonb)

```json
{
  "max_flows": 3,
  "max_nodes_per_flow": 20,
  "allow_scheduled": false,
  "allow_media": false
}
```

- Básico: 1 fluxo, 10 nós, sem agendado, sem mídia
- Intermediário: 5 fluxos, 30 nós, com agendado
- Premium: ilimitado

### Validação

- Backend valida limites ao salvar e ao ativar
- Frontend mostra limites na UI e desabilita opções bloqueadas

---

## Tratamento de Erros e Edge Cases

| Cenário | Tratamento |
|---------|------------|
| Loop infinito | Limite de 50 nós por execução. Ultrapassa → `failed` |
| Timeout wait_input | Bull job dispara após timeout, segue pela edge de timeout |
| Evolution API fora do ar | 3 retries com backoff exponencial. Falha total → marca nó como falho, tenta continuar |
| Múltiplas mensagens rápidas (delay) | Apenas a última é considerada quando retoma |
| Múltiplas mensagens rápidas (wait_input) | Primeira capturada, demais salvas no histórico |
| Fluxo desativado durante execução | Execuções em andamento completam. Novas não são criadas |
| Tenant desconecta WhatsApp | Todas execuções running/waiting_input → `cancelled` |

---

## Variáveis Disponíveis nos Templates de Nós

### Cliente & Pedido
`{{customer_name}}`, `{{order_number}}`, `{{total}}`, `{{subtotal}}`, `{{delivery_fee}}`, `{{discount}}`, `{{order_type}}`, `{{payment_method}}`, `{{items_list}}`, `{{items_count}}`, `{{notes}}`

### Loja
`{{store_name}}`, `{{store_phone}}`, `{{store_address}}`, `{{store_status}}`, `{{store_status_message}}`, `{{store_hours_today}}`, `{{store_hours}}`, `{{storefront_url}}`

### Contexto do Fluxo
`{{last_input}}`, `{{last_order.total}}`, `{{last_order.status}}`, `{{last_order.order_number}}`
