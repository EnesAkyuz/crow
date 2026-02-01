import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "chrome-extension://*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const updateSessionSchema = z.object({
  cookieData: z.string().min(1),
  expiresAt: z.string().optional(),
});

function encryptCookieData(data: string): string {
  return Buffer.from(data).toString("base64");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
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

  const { sessionId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { cookieData, expiresAt } = parsed.data;
  const encryptedData = encryptCookieData(cookieData);

  const { error } = await supabase
    .from("vault_sessions")
    .update({
      encrypted_data: encryptedData,
      expires_at: expiresAt || null,
      is_active: true,
      expiry_warning_sent: false,
      expired_notification_sent: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
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

  const { sessionId } = await params;

  const { error } = await supabase
    .from("vault_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
