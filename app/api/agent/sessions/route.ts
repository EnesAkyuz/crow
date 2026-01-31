import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/encryption";

/**
 * Session Status API
 *
 * GET /api/agent/sessions
 * Authorization: Bearer crow_xxxx
 *
 * Returns vault session status (no sensitive data).
 * Useful for agents to check if sessions are still valid.
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

  // Get sessions - only non-sensitive fields
  const { data: sessions, error: sessionsError } = await supabase
    .from("vault_sessions")
    .select(
      "id, name, description, expires_at, last_used_at, created_at, is_active",
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (sessionsError) {
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    tenant_id: tenant.id,
    endpoint: "/api/agent/sessions",
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    success: true,
    sessions: sessions.map((s) => {
      const expiresAt = s.expires_at ? new Date(s.expires_at) : null;
      const isExpired = expiresAt ? expiresAt < now : false;
      const isExpiringSoon =
        expiresAt && !isExpired ? expiresAt < sevenDaysFromNow : false;

      let status:
        | "active"
        | "expiring_soon"
        | "expired"
        | "no_expiry"
        | "inactive";
      if (!s.is_active) {
        status = "inactive";
      } else if (!expiresAt) {
        status = "no_expiry";
      } else if (isExpired) {
        status = "expired";
      } else if (isExpiringSoon) {
        status = "expiring_soon";
      } else {
        status = "active";
      }

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        status,
        expiresAt: s.expires_at,
        lastUsedAt: s.last_used_at,
        isExpiringSoon,
        isExpired,
      };
    }),
  });
}
