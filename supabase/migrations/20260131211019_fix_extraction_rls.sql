-- Fix RLS policies for extraction_schemas and document_extractions
-- Use is_org_member_of_tenant instead of tenant_members direct check
-- This allows org members to manage extraction schemas for their tenants

-- Drop existing policies for extraction_schemas
drop policy if exists "Users can view extraction schemas for their tenants" on extraction_schemas;
drop policy if exists "Users can create extraction schemas for their tenants" on extraction_schemas;
drop policy if exists "Users can update extraction schemas for their tenants" on extraction_schemas;
drop policy if exists "Users can delete extraction schemas for their tenants" on extraction_schemas;

-- Create new policies using is_org_member_of_tenant
create policy "Org members can view extraction schemas"
  on extraction_schemas for select
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can create extraction schemas"
  on extraction_schemas for insert
  with check ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can update extraction schemas"
  on extraction_schemas for update
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can delete extraction schemas"
  on extraction_schemas for delete
  using ( is_org_member_of_tenant(tenant_id) );

-- Drop existing policies for document_extractions
drop policy if exists "Users can view document extractions for their tenants" on document_extractions;
drop policy if exists "Users can create document extractions for their tenants" on document_extractions;
drop policy if exists "Users can update document extractions for their tenants" on document_extractions;
drop policy if exists "Users can delete document extractions for their tenants" on document_extractions;

-- Create new policies using is_org_member_of_tenant
create policy "Org members can view document extractions"
  on document_extractions for select
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can create document extractions"
  on document_extractions for insert
  with check ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can update document extractions"
  on document_extractions for update
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can delete document extractions"
  on document_extractions for delete
  using ( is_org_member_of_tenant(tenant_id) );
