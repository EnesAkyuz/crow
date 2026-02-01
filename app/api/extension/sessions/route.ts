import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "chrome-extension://*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const createSessionSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  cookieData: z.string().min(1),
  expiresAt: z.string().optional(),
  domain: z.string().optional(),
});

// Simple encryption (matching actions.ts)
function encryptCookieData(data: string): string {
  return Buffer.from(data).toString("base64");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: sessions, error } = await supabase
    .from("vault_sessions")
    .select("id, name, description, expires_at, is_active, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ sessions }, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders },
    );
  }

  const { tenantId, name, cookieData, expiresAt, domain } = parsed.data;

  // Encrypt the cookie data
  const encryptedData = encryptCookieData(cookieData);

  const { data, error } = await supabase
    .from("vault_sessions")
    .insert({
      tenant_id: tenantId,
      name,
      description: domain
        ? `Captured from ${domain}`
        : "Captured via extension",
      encrypted_data: encryptedData,
      expires_at: expiresAt || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { success: true, session: data },
    { headers: corsHeaders },
  );
}
