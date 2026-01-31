import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  url: z.string().url(),
  formats: z
    .array(z.enum(["markdown", "html", "raw", "links", "screenshot"]))
    .optional(),
  onlyMainContent: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  sessionCookies: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .optional(),
});

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

  const { url, formats, onlyMainContent, headers, sessionCookies } =
    parsed.data;

  const cookieHeader = sessionCookies?.length
    ? sessionCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ")
    : undefined;

  const response = await fetch(`${apiUrl}/v1/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: formats ?? ["markdown"],
      onlyMainContent: onlyMainContent ?? true,
      headers: {
        ...headers,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    return NextResponse.json(
      { error: "Firecrawl request failed", details: data },
      { status: response.status },
    );
  }

  return NextResponse.json({ data });
}
