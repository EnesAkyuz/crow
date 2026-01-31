import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/encryption";

/**
 * List Extractions API
 *
 * GET /api/agent/extractions
 * Authorization: Bearer crow_xxxx
 *
 * Returns a list of extraction metadata (without decrypted data).
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

  // Get query params
  const { searchParams } = new URL(request.url);
  const schemaId = searchParams.get("schemaId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build query
  let query = supabase
    .from("document_extractions")
    .select(
      "id, source_filename, source_type, source_url, field_names, status, extracted_at, schema_id",
    )
    .eq("tenant_id", tenant.id)
    .order("extracted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (schemaId) {
    query = query.eq("schema_id", schemaId);
  }

  const { data: extractions, error: extractionsError } = await query;

  if (extractionsError) {
    return NextResponse.json(
      { error: "Failed to fetch extractions" },
      { status: 500 },
    );
  }

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    tenant_id: tenant.id,
    endpoint: "/api/agent/extractions",
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    success: true,
    extractions: extractions.map((e) => ({
      id: e.id,
      schemaId: e.schema_id,
      source: e.source_filename,
      sourceType: e.source_type,
      sourceUrl: e.source_url,
      status: e.status,
      fields: e.field_names,
      extractedAt: e.extracted_at,
    })),
    pagination: {
      limit,
      offset,
      hasMore: extractions.length === limit,
    },
  });
}
