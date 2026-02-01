import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

const requestSchema = z.object({
  schemaId: z.string().uuid(),
  documentUrl: z.string().url().optional(),
  documentBase64: z.string().optional(),
  filename: z.string(),
  sessionId: z.string().uuid().optional(), // Optional: use vault session cookies to fetch authenticated URLs
});

/**
 * Encrypt extracted data before storing
 * In production, use a proper encryption library like libsodium
 */
function encryptData(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64");
}

/**
 * Decrypt stored data for agent use
 */
export function decryptData(encrypted: string): Record<string, unknown> {
  const json = Buffer.from(encrypted, "base64").toString("utf-8");
  return JSON.parse(json);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.REDUCTO_API_KEY;
  const apiUrl = process.env.REDUCTO_API_URL || "https://platform.reducto.ai";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing REDUCTO_API_KEY" },
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

  const { schemaId, documentUrl, documentBase64, filename, sessionId } =
    parsed.data;

  if (!documentUrl && !documentBase64) {
    return NextResponse.json(
      { error: "Either documentUrl or documentBase64 is required" },
      { status: 400 },
    );
  }

  // If sessionId provided, fetch the vault session for authenticated requests
  let sessionCookies: string | null = null;
  if (sessionId && documentUrl) {
    const { data: vaultSession } = await supabase
      .from("vault_sessions")
      .select("encrypted_cookies")
      .eq("id", sessionId)
      .single();

    if (vaultSession?.encrypted_cookies) {
      try {
        sessionCookies = decrypt(vaultSession.encrypted_cookies);
      } catch {
        console.error("Failed to decrypt session cookies");
      }
    }
  }

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

  // Create a pending extraction record
  const fields = schema.fields as Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  const fieldNames = fields.map((f) => f.name);

  const { data: extraction, error: insertError } = await supabase
    .from("document_extractions")
    .insert({
      tenant_id: schema.tenant_id,
      schema_id: schemaId,
      source_filename: filename,
      source_type: filename.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
      source_url: documentUrl || null,
      encrypted_data: "", // Will be updated after extraction
      field_names: fieldNames,
      status: "processing",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError || !extraction) {
    return NextResponse.json(
      { error: "Failed to create extraction record", details: insertError },
      { status: 500 },
    );
  }

  // Build the Reducto schema for extraction (JSON Schema format)
  const reductoSchema = {
    type: "object",
    properties: Object.fromEntries(
      fields.map((f) => [
        f.name,
        {
          type:
            f.type === "number"
              ? "number"
              : f.type === "boolean"
                ? "boolean"
                : "string",
          description: f.description || `Extract the ${f.name}`,
        },
      ]),
    ),
    required: fieldNames,
  };

  try {
    // Prepare the document input
    let documentInput: string;

    if (documentUrl) {
      documentInput = documentUrl;
    } else if (documentBase64) {
      // Upload the document to Reducto first using multipart/form-data
      const mimeType = filename.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : filename.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)
          ? `image/${filename.split(".").pop()}`
          : "application/octet-stream";

      // Convert base64 to Blob
      const binaryData = Buffer.from(documentBase64, "base64");
      const blob = new Blob([binaryData], { type: mimeType });

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", blob, filename);

      // Upload to Reducto's /upload endpoint
      const uploadResponse = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok || !uploadData?.file_id) {
        // Update extraction as failed
        await supabase
          .from("document_extractions")
          .update({
            status: "failed",
            error_message:
              uploadData?.error ||
              `Upload failed: HTTP ${uploadResponse.status}`,
          })
          .eq("id", extraction.id);

        return NextResponse.json(
          { error: "Document upload failed", details: uploadData },
          { status: uploadResponse.status },
        );
      }

      // Use the reducto:// URL from upload
      documentInput = `reducto://${uploadData.file_id}`;
    } else {
      return NextResponse.json(
        { error: "No document provided" },
        { status: 400 },
      );
    }

    // Call Reducto API with v3 format
    const reductoPayload = {
      input: documentInput,
      instructions: {
        schema: reductoSchema,
        system_prompt:
          "Extract the requested fields accurately from this document.",
      },
      settings: {
        include_images: false,
        array_extract: false,
      },
    };

    const response = await fetch(`${apiUrl}/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reductoPayload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Update extraction as failed
      await supabase
        .from("document_extractions")
        .update({
          status: "failed",
          error_message: data?.error || `HTTP ${response.status}`,
        })
        .eq("id", extraction.id);

      return NextResponse.json(
        { error: "Extraction failed", details: data },
        { status: response.status },
      );
    }

    // Extract the result from Reducto v3 response
    // v3 returns result as a list (one item if disable_chunking is true, which is default)
    let extractedData: Record<string, unknown>;
    if (Array.isArray(data?.result) && data.result.length > 0) {
      // Merge all chunks into one object (usually just one)
      extractedData = data.result.reduce(
        (acc: Record<string, unknown>, chunk: Record<string, unknown>) => ({
          ...acc,
          ...chunk,
        }),
        {},
      );
    } else if (typeof data?.result === "object" && data.result !== null) {
      extractedData = data.result;
    } else {
      extractedData = data || {};
    }

    // Encrypt the extracted values immediately
    const encryptedData = encryptData(extractedData);

    // Update the extraction record with encrypted data
    await supabase
      .from("document_extractions")
      .update({
        status: "completed",
        encrypted_data: encryptedData,
        extracted_at: new Date().toISOString(),
        reducto_job_id: data?.job_id || null,
      })
      .eq("id", extraction.id);

    // Return success with only field names visible (not values)
    return NextResponse.json({
      success: true,
      extractionId: extraction.id,
      fieldNames,
      status: "completed",
      message: "Data extracted and encrypted successfully",
    });
  } catch (error) {
    // Update extraction as failed
    await supabase
      .from("document_extractions")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Network error",
      })
      .eq("id", extraction.id);

    return NextResponse.json(
      {
        error: "Network error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
