import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allow extension to call this API
const corsHeaders = {
  "Access-Control-Allow-Origin": "chrome-extension://*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
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

  // Get all tenants the user has access to (as org member or tenant member)
  const { data: orgTenants } = await supabase
    .from("tenants")
    .select("id, name, organizations!inner(id, name)")
    .order("name");

  const { data: memberTenants } = await supabase
    .from("tenant_members")
    .select("tenants(id, name)")
    .eq("user_id", user.id);

  // Combine and dedupe
  const allTenants = new Map<string, { id: string; name: string }>();

  (orgTenants || []).forEach((t) => {
    allTenants.set(t.id, { id: t.id, name: t.name });
  });

  (memberTenants || []).forEach((m) => {
    if (m.tenants) {
      const t = m.tenants as { id: string; name: string };
      allTenants.set(t.id, { id: t.id, name: t.name });
    }
  });

  return NextResponse.json(
    { tenants: Array.from(allTenants.values()) },
    { headers: corsHeaders },
  );
}
