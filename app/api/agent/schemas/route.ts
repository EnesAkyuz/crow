import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/encryption";

/**
 * List Schemas API
 *
 * GET /api/agent/schemas
 * Authorization: Bearer crow_xxxx
 *
 * Returns all extraction schemas for the tenant.
 */
export async function GET(request: Request) {
  const supabase = createServiceRoleClient();

  // Extract API key from Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "Missing or invalid Authorization header",
        hint: "Use: Authorization: Bearer crow_your_api_key",
      },
      { status: 401 },
    );
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith("crow_")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 401 },
    );
  }

  // Hash the API key to find the tenant
  const keyHash = hashApiKey(apiKey);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("api_key_hash", keyHash)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Get schemas with extraction count
  const { data: schemas, error: schemasError } = await supabase
    .from("extraction_schemas")
    .select("id, name, fields, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (schemasError) {
    return NextResponse.json(
      { error: "Failed to fetch schemas" },
      { status: 500 },
    );
  }

  // Get extraction counts for each schema
  const schemaIds = schemas.map((s) => s.id);
  const { data: counts } = await supabase
    .from("document_extractions")
    .select("schema_id")
    .eq("tenant_id", tenant.id)
    .in("schema_id", schemaIds);

  const countMap = new Map<string, number>();
  counts?.forEach((c) => {
    const current = countMap.get(c.schema_id) || 0;
    countMap.set(c.schema_id, current + 1);
  });

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    tenant_id: tenant.id,
    endpoint: "/api/agent/schemas",
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    success: true,
    schemas: schemas.map((s) => ({
      id: s.id,
      name: s.name,
      fields: s.fields,
      extractionCount: countMap.get(s.id) || 0,
      createdAt: s.created_at,
    })),
  });
}
