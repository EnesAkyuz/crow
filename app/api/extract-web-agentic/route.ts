import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { encryptWithKey } from "@/lib/encryption";

const requestSchema = z.object({
  schemaId: z.string().uuid(),
  url: z.string().url(),
  sessionId: z.string().uuid().optional(),
  enableHandoff: z.boolean().optional().default(true), // Auto-extract PDFs found on page
  testMode: z.boolean().optional().default(false), // Return extracted data in response (for testing)
});

/**
 * Legacy encrypt (for tenants without API key)
 */
function encryptLegacy(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64");
}

/**
 * Decrypt vault session data
 */
function decryptCookieData(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

/**
 * Normalize cookie data to ensure proper format for Firecrawl
 */
function normalizeCookieData(cookieData: string): string {
  const trimmed = cookieData.trim();
  // If it looks like it already has cookie format (contains =), return as-is
  if (trimmed.includes("=")) {
    return trimmed;
  }
  // If it's just a value (likely a JWT), wrap it with a common cookie name
  return `auth-token=${trimmed}`;
}

/**
 * Extract PDF links from Firecrawl response
 */
function extractPdfLinks(data: any): string[] {
  const links: string[] = [];

  // Check links array
  if (data.links && Array.isArray(data.links)) {
    for (const link of data.links) {
      if (typeof link === "string" && link.toLowerCase().endsWith(".pdf")) {
        links.push(link);
      }
    }
  }

  // Check markdown content for PDF links
  if (data.markdown) {
    const pdfRegex = /https?:\/\/[^\s\)]+\.pdf/gi;
    const matches = data.markdown.match(pdfRegex);
    if (matches) {
      links.push(...matches);
    }
  }

  // Check HTML content for PDF links
  if (data.html) {
    const pdfRegex = /href=["'](https?:\/\/[^"']+\.pdf)["']/gi;
    let match;
    while ((match = pdfRegex.exec(data.html)) !== null) {
      links.push(match[1]);
    }
  }

  // Dedupe
  return [...new Set(links)];
}

/**
 * Extract data from a PDF using Reducto
 */
async function extractFromPdf(
  pdfUrl: string,
  schema: any,
  reductoApiKey: string,
  reductoApiUrl: string,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    // Download PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return { success: false, error: "Failed to download PDF" };
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    // Upload to Reducto
    const uploadForm = new FormData();
    uploadForm.append("file", pdfBlob, "document.pdf");

    const uploadResponse = await fetch(`${reductoApiUrl}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${reductoApiKey}`,
      },
      body: uploadForm,
    });

    if (!uploadResponse.ok) {
      return { success: false, error: "Failed to upload PDF to Reducto" };
    }

    const uploadData = await uploadResponse.json();
    const documentUrl = uploadData.document_url;

    if (!documentUrl) {
      return { success: false, error: "No document URL returned from upload" };
    }

    // Build schema for Reducto
    const fields = schema.fields as Array<{
      name: string;
      type: string;
      description?: string;
    }>;

    const reductoSchema = {
      type: "object",
      properties: fields.reduce(
        (acc, field) => {
          acc[field.name] = {
            type:
              field.type === "number"
                ? "number"
                : field.type === "boolean"
                  ? "boolean"
                  : "string",
            description: field.description || `Extract the ${field.name}`,
          };
          return acc;
        },
        {} as Record<string, { type: string; description: string }>,
      ),
      required: fields.map((f) => f.name),
    };

    // Extract with schema
    const extractResponse = await fetch(`${reductoApiUrl}/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${reductoApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: documentUrl,
        instructions: {
          schema: reductoSchema,
        },
      }),
    });

    if (!extractResponse.ok) {
      return { success: false, error: "Reducto extraction failed" };
    }

    const extractData = await extractResponse.json();

    // Parse the result
    let result: Record<string, unknown> = {};
    if (extractData.result) {
      if (typeof extractData.result === "string") {
        try {
          result = JSON.parse(extractData.result);
        } catch {
          result = { raw: extractData.result };
        }
      } else if (
        Array.isArray(extractData.result) &&
        extractData.result.length > 0
      ) {
        result = extractData.result[0];
      } else {
        result = extractData.result;
      }
    }

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  const firecrawlApiUrl =
    process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";
  const reductoApiKey = process.env.REDUCTO_API_KEY;
  const reductoApiUrl =
    process.env.REDUCTO_API_URL || "https://platform.reducto.ai";

  if (!firecrawlApiKey) {
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

  const { schemaId, url, sessionId, enableHandoff, testMode } = parsed.data;

  // Fetch the extraction schema with tenant info
  const { data: schema, error: schemaError } = await supabase
    .from("extraction_schemas")
    .select("*, tenants(id, name, api_key_hash)")
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
    const { data: vaultSession, error: sessionError } = await supabase
      .from("vault_sessions")
      .select("encrypted_data, is_active, name")
      .eq("id", sessionId)
      .single();

    console.log(`[Agentic Extract] Session lookup:`, {
      sessionId,
      found: !!vaultSession,
      isActive: vaultSession?.is_active,
      hasData: !!vaultSession?.encrypted_data,
      sessionName: vaultSession?.name,
      error: sessionError?.message,
    });

    if (vaultSession?.is_active && vaultSession?.encrypted_data) {
      const rawCookieData = decryptCookieData(vaultSession.encrypted_data);
      cookieHeader = normalizeCookieData(rawCookieData);
      console.log(
        `[Agentic Extract] Cookie header (first 50 chars): ${cookieHeader.substring(0, 50)}...`,
      );
    } else if (vaultSession && !vaultSession.is_active) {
      console.log(`[Agentic Extract] Session is inactive!`);
    } else if (vaultSession && !vaultSession.encrypted_data) {
      console.log(`[Agentic Extract] Session has no encrypted data!`);
    }
  } else {
    console.log(`[Agentic Extract] No sessionId provided`);
  }

  // Build Firecrawl extract schema
  const fields = schema.fields as Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  const fieldNames = fields.map((f) => f.name);

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

  // Create pending extraction record
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
    return NextResponse.json(
      { error: "Failed to create extraction record" },
      { status: 500 },
    );
  }

  try {
    // Call Firecrawl with extract + include links for handoff detection
    const firecrawlBody: Record<string, unknown> = {
      url,
      formats: ["extract", "links", "markdown"],
      extract: { schema: extractSchema },
    };

    // Add headers with cookie if session provided
    if (cookieHeader) {
      firecrawlBody.headers = { Cookie: cookieHeader };
      console.log(`[Agentic Extract] Sending to Firecrawl with Cookie header`);
    } else {
      console.log(
        `[Agentic Extract] Sending to Firecrawl WITHOUT Cookie header`,
      );
    }

    console.log(`[Agentic Extract] Firecrawl request:`, {
      url,
      hasHeaders: !!firecrawlBody.headers,
    });

    const response = await fetch(`${firecrawlApiUrl}/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(firecrawlBody),
    });

    const data = await response.json();

    if (!response.ok) {
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

    const extractedData = data.data?.extract || {};
    const handoffResults: Array<{
      pdfUrl: string;
      success: boolean;
      extractionId?: string;
    }> = [];

    // Agentic Handoff: Detect PDFs and extract from them
    if (enableHandoff && reductoApiKey) {
      const pdfLinks = extractPdfLinks(data.data || {});

      for (const pdfUrl of pdfLinks.slice(0, 3)) {
        // Limit to 3 PDFs per page
        const pdfResult = await extractFromPdf(
          pdfUrl,
          schema,
          reductoApiKey,
          reductoApiUrl,
        );

        if (pdfResult.success && pdfResult.data) {
          // Determine encryption method
          const tenantApiKeyHash = (schema.tenants as any)?.api_key_hash;
          let encryptedPdfData: string;

          // For handoff extractions, use legacy encryption (no API key context)
          encryptedPdfData = encryptLegacy(pdfResult.data);

          // Create extraction record for the PDF
          const { data: pdfExtraction } = await supabase
            .from("document_extractions")
            .insert({
              tenant_id: schema.tenant_id,
              schema_id: schemaId,
              source_filename: pdfUrl.split("/").pop() || "document.pdf",
              source_type: "pdf",
              source_url: pdfUrl,
              field_names: fieldNames,
              encrypted_data: encryptedPdfData,
              status: "completed",
              extracted_at: new Date().toISOString(),
              created_by: user.id,
            })
            .select()
            .single();

          handoffResults.push({
            pdfUrl,
            success: true,
            extractionId: pdfExtraction?.id,
          });
        } else {
          handoffResults.push({
            pdfUrl,
            success: false,
          });
        }
      }
    }

    // Encrypt and store the web extraction result
    const encryptedData = encryptLegacy(extractedData);

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
      // Include actual extracted data in test mode
      ...(testMode && { extractedData }),
      message: "Web extraction completed",
      handoff:
        handoffResults.length > 0
          ? {
              detected: handoffResults.length,
              successful: handoffResults.filter((r) => r.success).length,
              extractions: handoffResults,
            }
          : null,
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
