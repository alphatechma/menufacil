-- Tabela de "waits" para nodes do tipo `delay` no Flow Engine WhatsApp.
-- Cada linha representa uma execução pausada que deve ser retomada quando
-- resume_at for atingido. O worker WhatsappFlowWaitWorker varre essa tabela
-- periodicamente, processa os pendentes e marca processed=true (idempotência).

CREATE TABLE IF NOT EXISTS whatsapp_flow_waits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  version BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  execution_id UUID NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  next_node_id VARCHAR(255),
  resume_at TIMESTAMP NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP
);

CREATE INDEX idx_flow_waits_pending ON whatsapp_flow_waits(processed, resume_at);
CREATE INDEX idx_flow_waits_execution ON whatsapp_flow_waits(execution_id);
