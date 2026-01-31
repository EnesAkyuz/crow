import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  url: z.string().url(),
  formats: z
    .array(z.enum(["markdown", "html", "raw", "links", "screenshot"]))
    .optional(),
  onlyMainContent: z.boolean().optional(),
  waitFor: z.number().optional(),
});

/**
 * Decrypt the stored cookie data (reverse of encryption in actions.ts)
 */
function decryptCookieData(encryptedData: string): string {
  // Reverse the base64 encoding used in actions.ts
  const buffer = Buffer.from(encryptedData, "base64");
  return buffer.toString("utf-8");
}

/**
 * Normalize cookie data to ensure proper format for Firecrawl
 * Handles various formats users might paste:
 * - "auth-token=value" (correct)
 * - "value" (just the value, needs name)
 * - "auth-token=value; other=value2" (multiple cookies)
 */
function normalizeCookieData(cookieData: string): string {
  // Trim whitespace
  const trimmed = cookieData.trim();

  // If it looks like it already has cookie format (contains =), return as-is
  if (trimmed.includes("=")) {
    return trimmed;
  }

  // If it's just a value (likely a JWT), wrap it with a common cookie name
  // Users should ideally include the cookie name, but this is a fallback
  return `auth-token=${trimmed}`;
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

  const { sessionId, url, formats, onlyMainContent, waitFor } = parsed.data;

  // Fetch the vault session
  const { data: session, error: sessionError } = await supabase
    .from("vault_sessions")
    .select("*, tenants(id, name, organization_id)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Vault session not found" },
      { status: 404 },
    );
  }

  // Check if session is active
  if (!session.is_active) {
    // Log the error
    await supabase.from("vault_error_logs").insert({
      vault_session_id: sessionId,
      tenant_id: session.tenant_id,
      error_type: "auth_failed",
      error_message: "Session is paused/inactive",
      request_url: url,
    });

    return NextResponse.json(
      { error: "Session is inactive. Please resume it first." },
      { status: 400 },
    );
  }

  // Check if session has expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await supabase.from("vault_error_logs").insert({
      vault_session_id: sessionId,
      tenant_id: session.tenant_id,
      error_type: "auth_failed",
      error_message: "Session has expired",
      request_url: url,
    });

    return NextResponse.json(
      { error: "Session has expired. Please refresh the cookie." },
      { status: 400 },
    );
  }

  // Decrypt the cookie data
  const rawCookieData = session.encrypted_data
    ? decryptCookieData(session.encrypted_data)
    : null;

  if (!rawCookieData) {
    return NextResponse.json(
      { error: "No cookie data stored in session" },
      { status: 400 },
    );
  }

  // Normalize the cookie format
  const cookieData = normalizeCookieData(rawCookieData);

  // Log the cookie format (without revealing full value) for debugging
  console.log(
    `[Vault Scrape] Using cookie format: ${cookieData.substring(0, 30)}...`,
  );

  // Update usage stats
  await supabase
    .from("vault_sessions")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: (session.use_count || 0) + 1,
    })
    .eq("id", sessionId);

  // Make the Firecrawl request
  const startTime = Date.now();

  try {
    const response = await fetch(`${apiUrl}/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: formats ?? ["markdown", "screenshot"],
        onlyMainContent: onlyMainContent ?? true,
        waitFor: waitFor ?? 3000,
        headers: {
          Cookie: cookieData,
        },
      }),
    });

    const data = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const duration = Date.now() - startTime;

    if (!response.ok) {
      // Log the error
      const errorType =
        response.status === 401 || response.status === 403
          ? "auth_failed"
          : response.status === 429
            ? "rate_limited"
            : response.status >= 500
              ? "network"
              : "unknown";

      await supabase.from("vault_error_logs").insert({
        vault_session_id: sessionId,
        tenant_id: session.tenant_id,
        error_type: errorType,
        error_message:
          typeof data?.error === "string"
            ? data.error
            : `HTTP ${response.status}`,
        status_code: response.status,
        request_url: url,
      });

      return NextResponse.json(
        {
          error: "Scrape failed",
          details: data,
          duration,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      duration,
      session: {
        id: session.id,
        name: session.name,
        useCount: (session.use_count || 0) + 1,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log network error
    await supabase.from("vault_error_logs").insert({
      vault_session_id: sessionId,
      tenant_id: session.tenant_id,
      error_type: "network",
      error_message: error instanceof Error ? error.message : "Network error",
      request_url: url,
    });

    return NextResponse.json(
      {
        error: "Network error",
        details: error instanceof Error ? error.message : "Unknown error",
        duration,
      },
      { status: 500 },
    );
  }
}
