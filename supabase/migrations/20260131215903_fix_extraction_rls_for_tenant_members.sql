-- Fix RLS policies for extraction tables to allow tenant members (invited clients) access
-- Previously only org members could access; now both tenant members AND org members can

-- Drop existing policies for extraction_schemas
drop policy if exists "Org members can view extraction schemas" on extraction_schemas;
drop policy if exists "Org members can create extraction schemas" on extraction_schemas;
drop policy if exists "Org members can update extraction schemas" on extraction_schemas;
drop policy if exists "Org members can delete extraction schemas" on extraction_schemas;

-- Create new policies allowing both tenant members and org members
create policy "Users can view extraction schemas"
  on extraction_schemas for select
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can create extraction schemas"
  on extraction_schemas for insert
  with check ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can update extraction schemas"
  on extraction_schemas for update
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can delete extraction schemas"
  on extraction_schemas for delete
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

-- Drop existing policies for document_extractions
drop policy if exists "Org members can view document extractions" on document_extractions;
drop policy if exists "Org members can create document extractions" on document_extractions;
drop policy if exists "Org members can update document extractions" on document_extractions;
drop policy if exists "Org members can delete document extractions" on document_extractions;

-- Create new policies allowing both tenant members and org members
create policy "Users can view document extractions"
  on document_extractions for select
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can create document extractions"
  on document_extractions for insert
  with check ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can update document extractions"
  on document_extractions for update
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

create policy "Users can delete document extractions"
  on document_extractions for delete
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );
