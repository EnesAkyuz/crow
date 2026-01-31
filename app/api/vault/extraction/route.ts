import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  extractionId: z.string().uuid(),
});

/**
 * Decrypt stored data for agent use
 */
function decryptData(encrypted: string): Record<string, unknown> {
  const json = Buffer.from(encrypted, "base64").toString("utf-8");
  return JSON.parse(json);
}

/**
 * This endpoint is for AGENTS ONLY to access decrypted extraction data
 * In production, this should require API key authentication, not user auth
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { extractionId } = parsed.data;

  // Fetch the extraction with schema info
  const { data: extraction, error: extractionError } = await supabase
    .from("document_extractions")
    .select("*, extraction_schemas(name, fields)")
    .eq("id", extractionId)
    .single();

  if (extractionError || !extraction) {
    return NextResponse.json(
      { error: "Extraction not found" },
      { status: 404 },
    );
  }

  if (extraction.status !== "completed") {
    return NextResponse.json(
      {
        error: `Extraction is ${extraction.status}`,
        status: extraction.status,
      },
      { status: 400 },
    );
  }

  // Decrypt the data for agent use
  const decryptedData = decryptData(extraction.encrypted_data);

  // Log access for audit trail (optional: create an access_logs table)
  console.log(
    `[Vault Access] User ${user.id} accessed extraction ${extractionId} at ${new Date().toISOString()}`,
  );

  return NextResponse.json({
    success: true,
    extractionId,
    schemaName: extraction.extraction_schemas?.name,
    sourceFilename: extraction.source_filename,
    extractedAt: extraction.extracted_at,
    data: decryptedData,
  });
}
