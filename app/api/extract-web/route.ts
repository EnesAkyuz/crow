import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  schemaId: z.string().uuid(),
  url: z.string().url(),
  sessionId: z.string().uuid().optional(), // Optional vault session for authenticated scraping
});

/**
 * Encrypt extracted data before storing
 */
function encryptData(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64");
}

/**
 * Decrypt vault session data
 */
function decryptCookieData(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  const apiUrl = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing FIRECRAWL_API_KEY" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { schemaId, url, sessionId } = parsed.data;

  // Fetch the extraction schema
  const { data: schema, error: schemaError } = await supabase
    .from("extraction_schemas")
    .select("*, tenants(id, name)")
    .eq("id", schemaId)
    .single();

  if (schemaError || !schema) {
    return NextResponse.json(
      { error: "Extraction schema not found" },
      { status: 404 },
    );
  }

  if (!schema.is_active) {
    return NextResponse.json({ error: "Schema is inactive" }, { status: 400 });
  }

  // Get vault session if provided
  let cookieHeader: string | undefined;
  if (sessionId) {
    const { data: vaultSession } = await supabase
      .from("vault_sessions")
      .select("encrypted_data, is_active")
      .eq("id", sessionId)
      .single();

    if (vaultSession?.is_active && vaultSession?.encrypted_data) {
      cookieHeader = decryptCookieData(vaultSession.encrypted_data);
    }
  }

  // Build Firecrawl extract schema from our schema fields
  const fields = schema.fields as Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  const fieldNames = fields.map((f) => f.name);

  // Convert our field types to JSON schema types
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    date: "string",
    boolean: "boolean",
  };

  const extractSchema = {
    type: "object",
    properties: fields.reduce(
      (acc, field) => {
        acc[field.name] = {
          type: typeMap[field.type] || "string",
          description: field.description || `Extract the ${field.name}`,
        };
        return acc;
      },
      {} as Record<string, { type: string; description: string }>,
    ),
    required: fieldNames,
  };

  // Create a pending extraction record
  const { data: extraction, error: insertError } = await supabase
    .from("document_extractions")
    .insert({
      tenant_id: schema.tenant_id,
      schema_id: schemaId,
      source_filename: new URL(url).hostname,
      source_type: "web",
      source_url: url,
      field_names: fieldNames,
      encrypted_data: "",
      status: "processing",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError || !extraction) {
    console.error("Insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create extraction record" },
      { status: 500 },
    );
  }

  try {
    // Call Firecrawl with extract option
    const response = await fetch(`${apiUrl}/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["extract"],
        extract: {
          schema: extractSchema,
        },
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      await supabase
        .from("document_extractions")
        .update({
          status: "failed",
          error_message: data.error || "Firecrawl request failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", extraction.id);

      return NextResponse.json(
        { error: data.error || "Firecrawl extraction failed" },
        { status: 500 },
      );
    }

    // Extract the structured data from response
    const extractedData = data.data?.extract || {};

    // Encrypt and store the result
    const encryptedData = encryptData(extractedData);

    await supabase
      .from("document_extractions")
      .update({
        encrypted_data: encryptedData,
        status: "completed",
        extracted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", extraction.id);

    return NextResponse.json({
      success: true,
      extractionId: extraction.id,
      fieldNames,
      message: "Web extraction completed",
    });
  } catch (err) {
    console.error("Extraction error:", err);

    await supabase
      .from("document_extractions")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", extraction.id);

    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
