import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  hashApiKey,
  decryptWithKey,
  decryptLegacy,
  isNewEncryptionFormat,
} from "@/lib/encryption";

/**
 * Agent Extraction API
 *
 * GET /api/agent/extract?extractionId=xxx
 * Authorization: Bearer crow_xxxx
 *
 * Returns decrypted extraction data for the agent.
 * The API key is used both for authentication AND decryption.
 */
export async function GET(request: Request) {
  // Use service role client to bypass RLS - we do our own auth via API key
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

  const apiKey = authHeader.substring(7); // Remove "Bearer "

  if (!apiKey.startsWith("crow_")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 401 },
    );
  }

  // Get extraction ID from query params
  const { searchParams } = new URL(request.url);
  const extractionId = searchParams.get("extractionId");
  const schemaId = searchParams.get("schemaId");
  const latest = searchParams.get("latest") === "true";

  if (!extractionId && !schemaId && !latest) {
    return NextResponse.json(
      {
        error: "Missing required parameter",
        hint: "Provide extractionId, schemaId, or latest=true",
      },
      { status: 400 },
    );
  }

  // Hash the API key to find the tenant
  const keyHash = hashApiKey(apiKey);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, api_key_hash")
    .eq("api_key_hash", keyHash)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Build the query based on parameters
  let query = supabase
    .from("document_extractions")
    .select(
      "id, source_filename, source_type, source_url, encrypted_data, field_names, status, extracted_at, schema_id",
    )
    .eq("tenant_id", tenant.id)
    .eq("status", "completed");

  if (extractionId) {
    query = query.eq("id", extractionId);
  } else if (schemaId) {
    query = query
      .eq("schema_id", schemaId)
      .order("extracted_at", { ascending: false })
      .limit(1);
  } else if (latest) {
    query = query.order("extracted_at", { ascending: false }).limit(1);
  }

  const { data: extraction, error: extractionError } = await query.single();

  if (extractionError || !extraction) {
    return NextResponse.json(
      { error: "Extraction not found or not completed" },
      { status: 404 },
    );
  }

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    tenant_id: tenant.id,
    endpoint: "/api/agent/extract",
    extraction_id: extraction.id,
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  });

  // Decrypt the data
  let decryptedData: Record<string, unknown>;
  try {
    if (isNewEncryptionFormat(extraction.encrypted_data)) {
      // New E2EE format - decrypt with API key
      decryptedData = decryptWithKey(extraction.encrypted_data, apiKey);
    } else {
      // Legacy base64 format - still works but less secure
      decryptedData = decryptLegacy(extraction.encrypted_data);
    }
  } catch (err) {
    console.error("Decryption error:", err);
    return NextResponse.json(
      { error: "Failed to decrypt data. Check your API key." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    extraction: {
      id: extraction.id,
      schemaId: extraction.schema_id,
      source: extraction.source_filename,
      sourceType: extraction.source_type,
      sourceUrl: extraction.source_url,
      extractedAt: extraction.extracted_at,
      fields: extraction.field_names,
    },
    data: decryptedData,
  });
}

/**
 * POST endpoint for running extractions via API
 * (Future: allow agents to trigger extractions)
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      error: "Not implemented",
      hint: "Use the dashboard to create extractions, then retrieve via GET",
    },
    { status: 501 },
  );
}
