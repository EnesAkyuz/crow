-- Scheduled Workflows table
-- Stores workflow definitions with scheduling information

CREATE TABLE scheduled_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Workflow definition as JSON (steps array)
  workflow_definition JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('manual', 'interval', 'cron')),
  schedule_interval_minutes INTEGER, -- For interval type
  schedule_cron TEXT, -- For cron type (future)
  -- Tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_error TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for finding workflows due to run
CREATE INDEX idx_scheduled_workflows_next_run ON scheduled_workflows (next_run_at)
  WHERE is_active = true AND schedule_type != 'manual';

-- Index for tenant lookup
CREATE INDEX idx_scheduled_workflows_tenant ON scheduled_workflows (tenant_id);

-- RLS policies
ALTER TABLE scheduled_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view scheduled workflows"
  ON scheduled_workflows FOR SELECT
  USING (is_org_member_of_tenant(tenant_id) OR is_tenant_member(tenant_id));

CREATE POLICY "Org members can create scheduled workflows"
  ON scheduled_workflows FOR INSERT
  WITH CHECK (is_org_member_of_tenant(tenant_id));

CREATE POLICY "Org members can update scheduled workflows"
  ON scheduled_workflows FOR UPDATE
  USING (is_org_member_of_tenant(tenant_id));

CREATE POLICY "Org members can delete scheduled workflows"
  ON scheduled_workflows FOR DELETE
  USING (is_org_member_of_tenant(tenant_id));

-- Workflow run history
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES scheduled_workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  -- Results as JSON
  results JSONB,
  -- Trigger info
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'schedule', 'api')),
  triggered_by_user UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for workflow runs
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs (workflow_id);
CREATE INDEX idx_workflow_runs_tenant ON workflow_runs (tenant_id);

-- RLS for workflow runs
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow runs"
  ON workflow_runs FOR SELECT
  USING (is_org_member_of_tenant(tenant_id) OR is_tenant_member(tenant_id));

CREATE POLICY "System can insert workflow runs"
  ON workflow_runs FOR INSERT
  WITH CHECK (is_org_member_of_tenant(tenant_id));

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Updated_at trigger
CREATE TRIGGER update_scheduled_workflows_updated_at
  BEFORE UPDATE ON scheduled_workflows
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
