import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface SchemaField {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  description: string;
}

/**
 * Natural Language Schema Builder
 *
 * POST /api/ai/generate-schema
 * Body: { prompt: "I want to extract invoice data..." }
 *
 * Returns a suggested schema based on the natural language description.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const systemPrompt = `You are a schema designer for a data extraction system. Given a user's description of what they want to extract, generate a JSON schema with fields.

Rules:
1. Field names should be camelCase (e.g., invoiceTotal, vendorName)
2. Types must be one of: string, number, date, boolean
3. Each field needs a clear description
4. Generate 3-10 relevant fields based on the use case
5. Be practical and focus on commonly needed data points

Respond ONLY with valid JSON in this exact format:
{
  "name": "Schema Name",
  "description": "Brief description of what this schema extracts",
  "fields": [
    {"name": "fieldName", "type": "string", "description": "What this field contains"}
  ]
}

Do not include any other text, markdown, or explanation. Just the JSON.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser request: ${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 },
      );
    }

    // Parse the JSON response (handle potential markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const schema = JSON.parse(jsonText);

    // Validate the response structure
    if (!schema.name || !schema.fields || !Array.isArray(schema.fields)) {
      return NextResponse.json(
        { error: "Invalid schema generated" },
        { status: 500 },
      );
    }

    // Validate each field
    const validTypes = ["string", "number", "date", "boolean"];
    const validatedFields: SchemaField[] = schema.fields
      .filter(
        (f: any) =>
          f.name &&
          typeof f.name === "string" &&
          validTypes.includes(f.type) &&
          f.description,
      )
      .map((f: any) => ({
        name: f.name,
        type: f.type,
        description: f.description,
      }));

    if (validatedFields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields generated" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      schema: {
        name: schema.name,
        description: schema.description || "",
        fields: validatedFields,
      },
    });
  } catch (error) {
    console.error("Schema generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate schema" },
      { status: 500 },
    );
  }
}
