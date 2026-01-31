import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Decrypt stored data - DEV ONLY
 */
function decryptData(encrypted: string): Record<string, unknown> {
  const json = Buffer.from(encrypted, "base64").toString("utf-8");
  return JSON.parse(json);
}

export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Debug endpoint only available in development" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const extractionId = searchParams.get("id");

  if (!extractionId) {
    return NextResponse.json(
      { error: "Missing extraction ID" },
      { status: 400 },
    );
  }

  const { data: extraction, error } = await supabase
    .from("document_extractions")
    .select("*")
    .eq("id", extractionId)
    .single();

  if (error || !extraction) {
    return NextResponse.json(
      { error: "Extraction not found" },
      { status: 404 },
    );
  }

  if (!extraction.encrypted_data) {
    return NextResponse.json({ data: null, message: "No data extracted" });
  }

  try {
    const decrypted = decryptData(extraction.encrypted_data);
    return NextResponse.json({
      data: decrypted,
      source: extraction.source_filename,
      status: extraction.status,
      extractedAt: extraction.extracted_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt data" },
      { status: 500 },
    );
  }
}
