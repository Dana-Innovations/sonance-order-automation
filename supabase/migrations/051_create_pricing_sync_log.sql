-- Create audit log table for nightly pricing sync
CREATE TABLE IF NOT EXISTS pricing_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_sync_log_started ON pricing_sync_log(sync_started_at DESC);

COMMENT ON TABLE pricing_sync_log IS 'Audit log for nightly customer pricing sync from SQL Server';
