import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  urls: z.array(z.string()).min(1),
  prompt: z.string().min(1),
  schemaId: z.string().uuid().optional(),
  enableWebSearch: z.boolean().optional().default(false),
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

    const { urls, prompt, schemaId, enableWebSearch } = parsed.data;

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 },
      );
    }

    // If schema provided, fetch it
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

    // Build extract payload with FIRE-1 agent
    const extractPayload: Record<string, unknown> = {
      urls,
      prompt,
      enableWebSearch,
      agent: {
        model: "FIRE-1",
      },
    };

    // Add schema if provided
    if (schema) {
      extractPayload.schema = {
        type: "object",
        properties: schema,
      };
    }

    // Call Firecrawl extract endpoint with FIRE-1 agent
    const extractResponse = await fetch(
      "https://api.firecrawl.dev/v2/extract",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlApiKey}`,
        },
        body: JSON.stringify(extractPayload),
      },
    );

    const extractData = await extractResponse.json();
    console.log(
      "Firecrawl extract response:",
      JSON.stringify(extractData, null, 2),
    );

    if (!extractResponse.ok) {
      return NextResponse.json(
        { error: "Agent extraction failed", details: extractData },
        { status: 500 },
      );
    }

    // Firecrawl /v2/extract is ALWAYS async - it returns an ID to poll
    // The ID might be at extractData.id or nested in extractData.data.id
    const jobId = extractData.id || extractData.data?.id;
    if (jobId) {
      return NextResponse.json({
        success: true,
        async: true,
        jobId: jobId,
        status: extractData.status || "processing",
        message: "Agent extraction started. Poll for results.",
      });
    }

    // Fallback: If somehow we get immediate data
    const resultData =
      extractData.data ||
      extractData.results ||
      extractData.extract ||
      extractData;

    return NextResponse.json({
      success: true,
      async: false,
      data: resultData,
      status: "completed",
      _debug: { keys: Object.keys(extractData) },
    });
  } catch (error) {
    console.error("Agent extract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET endpoint to check extract job status
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
      `https://api.firecrawl.dev/v2/extract/${jobId}`,
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
      data: statusData.data,
      error: statusData.error,
    });
  } catch (error) {
    console.error("Agent status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
