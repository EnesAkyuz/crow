import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const requestSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  data: z.record(z.string(), z.unknown()),
  isTest: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json(
      { error: "Email service not configured (RESEND_API_KEY missing)" },
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

  const { to, subject, data, isTest } = parsed.data;

  // Format the data as a readable email body
  const formatValue = (value: unknown, indent = 0): string => {
    const prefix = "  ".repeat(indent);
    if (value === null || value === undefined) {
      return "N/A";
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${prefix}${k}: ${formatValue(v, indent + 1)}`)
        .join("\n");
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => `${prefix}- ${formatValue(v, indent + 1)}`)
        .join("\n");
    }
    return String(value);
  };

  const dataLines = Object.entries(data)
    .filter(([key]) => !key.startsWith("_")) // Skip internal fields like _transformed
    .map(([key, value]) => {
      const formattedValue =
        typeof value === "object"
          ? `\n${formatValue(value, 1)}`
          : String(value);
      return `${key}: ${formattedValue}`;
    })
    .join("\n\n");

  const emailSubject = isTest ? `[TEST] ${subject}` : subject;

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      ${isTest ? '<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px;"><strong>⚠️ TEST MODE</strong> - This is a test email from Crow workflow builder.</div>' : ""}
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        ${subject}
      </h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <pre style="font-family: monospace; font-size: 13px; white-space: pre-wrap; margin: 0;">${dataLines}</pre>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Sent by Crow • Automated Data Extraction
      </p>
    </div>
  `;

  const textBody = `${isTest ? "[TEST MODE]\n\n" : ""}${subject}\n${"=".repeat(subject.length)}\n\n${dataLines}\n\n---\nSent by Crow • Automated Data Extraction`;

  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Crow <onboarding@resend.dev>",
      to: [to],
      subject: emailSubject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult?.id,
      to,
      subject: emailSubject,
      isTest,
    });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
