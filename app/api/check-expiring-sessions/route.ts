import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get sessions needing notification
  const { data: sessions, error } = await supabase.rpc(
    "get_sessions_needing_notification",
  );

  if (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, message: "Database error" },
      { status: 500 },
    );
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No sessions need notifications",
      processed: 0,
    });
  }

  let successful = 0;
  let failed = 0;

  for (const session of sessions) {
    try {
      // Send email notification
      if (resend && session.notification_email) {
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const minutesUntilExpiry = Math.round(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60),
        );

        let timeUntilExpiry: string;
        if (minutesUntilExpiry < 60) {
          timeUntilExpiry = `${minutesUntilExpiry} minute${minutesUntilExpiry !== 1 ? "s" : ""}`;
        } else if (minutesUntilExpiry < 1440) {
          const hours = Math.round(minutesUntilExpiry / 60);
          timeUntilExpiry = `${hours} hour${hours !== 1 ? "s" : ""}`;
        } else {
          const days = Math.round(minutesUntilExpiry / 1440);
          timeUntilExpiry = `${days} day${days !== 1 ? "s" : ""}`;
        }

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Crow <alerts@crow.dev>",
          to: session.notification_email,
          subject: `⚠️ Vault Session "${session.session_name}" expires in ${timeUntilExpiry}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #000; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px;">
                Session Expiring Soon
              </h2>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Your vault session <strong>"${session.session_name}"</strong> for tenant 
                <strong>"${session.tenant_name}"</strong> will expire in <strong>${timeUntilExpiry}</strong>.
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                <strong>Expires at:</strong> ${expiresAt.toLocaleString()}
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Please refresh your session cookies to maintain uninterrupted access.
              </p>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                  Crow — Secure Session Vault
                </p>
              </div>
            </div>
          `,
        });
      }

      // Log the notification
      await supabase.from("vault_notification_logs").insert({
        session_id: session.session_id,
        notification_type: "expiry_warning",
        sent_to: session.notification_email,
        sent_at: new Date().toISOString(),
      });

      // Mark as sent
      await supabase
        .from("vault_sessions")
        .update({ expiry_warning_sent: true })
        .eq("id", session.session_id);

      successful++;
    } catch (err) {
      console.error(`Failed to process session ${session.session_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${sessions.length} sessions`,
    processed: sessions.length,
    successful,
    failed,
  });
}
