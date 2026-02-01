import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  url: z.string().url(),
  search: z.string().optional(),
  limit: z.number().min(1).max(5000).optional().default(100),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url, search, limit } = parsed.data;

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 },
      );
    }

    // Call Firecrawl map endpoint
    const mapPayload: Record<string, unknown> = {
      url,
      limit,
      ...(search && { search }),
    };

    const mapResponse = await fetch("https://api.firecrawl.dev/v2/map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify(mapPayload),
    });

    const mapData = await mapResponse.json();

    if (!mapResponse.ok) {
      return NextResponse.json(
        { error: "Map failed", details: mapData },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      urls: mapData.links || [],
      totalUrls: mapData.links?.length || 0,
    });
  } catch (error) {
    console.error("Map error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
