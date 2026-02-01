import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  url: z.string().url(),
  limit: z.number().min(1).max(1000).optional().default(10),
  maxDepth: z.number().min(1).max(10).optional().default(3),
  allowSubdomains: z.boolean().optional().default(false),
  schemaId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
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

    const { url, limit, maxDepth, allowSubdomains, schemaId, sessionId } =
      parsed.data;

    // If schema provided, fetch it for JSON extraction
    let schema: Record<string, unknown> | null = null;
    if (schemaId) {
      const { data: schemaData } = await supabase
        .from("extraction_schemas")
        .select("fields")
        .eq("id", schemaId)
        .single();

      if (schemaData?.fields) {
        schema = schemaData.fields as Record<string, unknown>;
      }
    }

    // If session provided, get cookies for auth
    const headers: Record<string, string> = {};
    if (sessionId) {
      const { data: session } = await supabase
        .from("vault_sessions")
        .select("encrypted_data")
        .eq("id", sessionId)
        .single();

      if (session?.encrypted_data) {
        const cookieData = Buffer.from(
          session.encrypted_data,
          "base64",
        ).toString("utf-8");
        headers["Cookie"] = cookieData;
      }
    }

    // Start crawl job via Firecrawl
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 },
      );
    }

    const crawlPayload: Record<string, unknown> = {
      url,
      limit,
      maxDepth,
      allowSubdomains,
      scrapeOptions: {
        formats: schema ? ["markdown", "json"] : ["markdown"],
        ...(schema && {
          jsonOptions: {
            schema: {
              type: "object",
              properties: schema,
            },
          },
        }),
        ...(Object.keys(headers).length > 0 && { headers }),
      },
    };

    const crawlResponse = await fetch("https://api.firecrawl.dev/v2/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify(crawlPayload),
    });

    const crawlData = await crawlResponse.json();

    if (!crawlResponse.ok) {
      return NextResponse.json(
        { error: "Crawl failed", details: crawlData },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      jobId: crawlData.id,
      statusUrl: crawlData.url,
      message: "Crawl job started. Poll the status URL for results.",
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET endpoint to check crawl status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 },
      );
    }

    const statusResponse = await fetch(
      `https://api.firecrawl.dev/v2/crawl/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${firecrawlApiKey}`,
        },
      },
    );

    const statusData = await statusResponse.json();

    return NextResponse.json({
      success: true,
      status: statusData.status,
      total: statusData.total,
      completed: statusData.completed,
      data: statusData.data,
    });
  } catch (error) {
    console.error("Crawl status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
