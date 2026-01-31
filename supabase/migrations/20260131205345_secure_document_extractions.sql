-- Secure Document Extractions Schema
-- Stores extraction schemas and encrypted extracted data

-- Extraction schemas define what fields to extract from documents
create table if not exists extraction_schemas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  fields jsonb not null default '[]', -- Array of { name: string, type: 'string'|'number'|'date'|'boolean', description?: string }
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Document extractions store the encrypted extracted values
create table if not exists document_extractions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  schema_id uuid not null references extraction_schemas(id) on delete cascade,
  source_filename text not null,
  source_type text not null default 'pdf', -- pdf, image, etc.
  source_url text, -- optional: if from a URL
  encrypted_data text not null, -- base64 encoded encrypted JSON of { field_name: value }
  field_names text[] not null default '{}', -- unencrypted list of field names for display
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  reducto_job_id text, -- for tracking async jobs
  extracted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups
create index if not exists idx_extraction_schemas_tenant on extraction_schemas(tenant_id);
create index if not exists idx_document_extractions_tenant on document_extractions(tenant_id);
create index if not exists idx_document_extractions_schema on document_extractions(schema_id);
create index if not exists idx_document_extractions_status on document_extractions(status);

-- RLS policies for extraction_schemas
alter table extraction_schemas enable row level security;

create policy "Users can view extraction schemas for their tenants"
  on extraction_schemas for select
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = extraction_schemas.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can create extraction schemas for their tenants"
  on extraction_schemas for insert
  with check (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = extraction_schemas.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can update extraction schemas for their tenants"
  on extraction_schemas for update
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = extraction_schemas.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can delete extraction schemas for their tenants"
  on extraction_schemas for delete
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = extraction_schemas.tenant_id
      and tm.user_id = auth.uid()
    )
  );

-- RLS policies for document_extractions
alter table document_extractions enable row level security;

create policy "Users can view document extractions for their tenants"
  on document_extractions for select
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = document_extractions.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can create document extractions for their tenants"
  on document_extractions for insert
  with check (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = document_extractions.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can update document extractions for their tenants"
  on document_extractions for update
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = document_extractions.tenant_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Users can delete document extractions for their tenants"
  on document_extractions for delete
  using (
    exists (
      select 1 from tenant_members tm
      where tm.tenant_id = document_extractions.tenant_id
      and tm.user_id = auth.uid()
    )
  );

-- Updated_at triggers
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger extraction_schemas_updated_at
  before update on extraction_schemas
  for each row
  execute function set_updated_at();

create trigger document_extractions_updated_at
  before update on document_extractions
  for each row
  execute function set_updated_at();
