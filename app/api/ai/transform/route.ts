import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface TransformRequest {
  data: Record<string, unknown>;
  prompt: string;
}

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as TransformRequest;
    const { data, prompt } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Transform prompt is required" },
        { status: 400 },
      );
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No data provided to transform" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a data transformation assistant. You will receive structured data and a user's transformation request. Transform the data according to the user's instructions.

RULES:
1. Always return valid JSON
2. Preserve data integrity - don't make up values that weren't in the original data
3. You can restructure, rename fields, filter, summarize, or format as requested
4. If the user asks for a summary or text output, return it as { "result": "your text here" }
5. Be concise and follow the user's instructions precisely

INPUT DATA:
${JSON.stringify(data, null, 2)}

USER'S TRANSFORMATION REQUEST:
${prompt}

Return ONLY the transformed JSON, no explanation or markdown.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: "Failed to transform data with AI" },
        { status: 500 },
      );
    }

    const result = await response.json();
    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    // Parse the JSON
    let transformedData: Record<string, unknown>;
    try {
      transformedData = JSON.parse(cleanedText);
    } catch {
      // If parsing fails, wrap the text result
      transformedData = { result: cleanedText };
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
      originalDataKeys: Object.keys(data),
    });
  } catch (error) {
    console.error("Transform error:", error);
    return NextResponse.json(
      { error: "Failed to process transformation" },
      { status: 500 },
    );
  }
}
