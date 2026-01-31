"use client";

import { useRouter } from "next/navigation";
import { deleteVaultSession, toggleVaultSessionActive } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { RefreshVaultSessionDialog } from "./refresh-vault-session-dialog";
import { TestScrapeDialog } from "./test-scrape-dialog";

interface VaultSession {
  id: string;
  name: string;
  description: string | null;
  expires_at: string | null;
  expiry_warning_sent: boolean | null;
  is_active: boolean | null;
  last_used_at: string | null;
  use_count: number | null;
  rate_limit_per_hour: number | null;
  rate_limit_per_day: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface VaultErrorLog {
  id: string;
  vault_session_id: string;
  error_type: string;
  error_message: string | null;
  status_code: number | null;
  request_url: string | null;
  created_at: string | null;
}

interface VaultSessionListProps {
  sessions: VaultSession[];
  errorLogs: VaultErrorLog[];
}

function getExpiryStatus(
  expiresAt: string | null,
): "expired" | "expiring_soon" | "active" | "no_expiry" {
  if (!expiresAt) return "no_expiry";

  const expiry = new Date(expiresAt);
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  if (expiry < now) return "expired";
  if (expiry < threeDaysFromNow) return "expiring_soon";
  return "active";
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatExpiryTime(dateStr: string | null): string {
  if (!dateStr) return "No expiry set";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d remaining`;
  if (diffHours > 0) return `${diffHours}h remaining`;
  if (diffMins > 0) return `${diffMins}m remaining`;
  return "Expiring now";
}

export function VaultSessionList({
  sessions,
  errorLogs,
}: VaultSessionListProps) {
  const router = useRouter();

  const getRecentErrorsForSession = (sessionId: string) => {
    return errorLogs
      .filter((log) => log.vault_session_id === sessionId)
      .slice(0, 3);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    const formData = new FormData();
    formData.set("sessionId", sessionId);
    await deleteVaultSession(formData);
    router.refresh();
  };

  const handleToggleActive = async (sessionId: string, isActive: boolean) => {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("isActive", String(!isActive));
    await toggleVaultSessionActive(formData);
    router.refresh();
  };

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No vault sessions yet.</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
          Add a session to enable authenticated scraping.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {sessions.map((session) => {
        const expiryStatus = getExpiryStatus(session.expires_at);
        const recentErrors = getRecentErrorsForSession(session.id);
        const isActive = session.is_active ?? true;

        return (
          <div key={session.id} className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{session.name}</h3>
                  {!isActive && (
                    <Badge
                      variant="outline"
                      className="text-[8px] uppercase tracking-widest"
                    >
                      Paused
                    </Badge>
                  )}
                  {expiryStatus === "expired" && (
                    <Badge
                      variant="destructive"
                      className="text-[8px] uppercase tracking-widest"
                    >
                      Expired
                    </Badge>
                  )}
                  {expiryStatus === "expiring_soon" && (
                    <Badge
                      variant="secondary"
                      className="text-[8px] uppercase tracking-widest bg-yellow-500/10 text-yellow-600"
                    >
                      Expiring Soon
                    </Badge>
                  )}
                </div>
                {session.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {session.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TestScrapeDialog
                  sessionId={session.id}
                  sessionName={session.name}
                />
                <RefreshVaultSessionDialog
                  sessionId={session.id}
                  sessionName={session.name}
                />
                <button
                  onClick={() => handleToggleActive(session.id, isActive)}
                  className={`text-[10px] uppercase font-bold hover:underline ${
                    isActive ? "text-yellow-600" : "text-green-600"
                  }`}
                >
                  {isActive ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="text-[10px] text-red-500 uppercase font-bold hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] uppercase tracking-widest">
              <div>
                <span className="text-muted-foreground">Expires</span>
                <p
                  className={`font-medium ${
                    expiryStatus === "expired"
                      ? "text-red-500"
                      : expiryStatus === "expiring_soon"
                        ? "text-yellow-600"
                        : ""
                  }`}
                >
                  {formatExpiryTime(session.expires_at)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Used</span>
                <p className="font-medium">
                  {formatRelativeTime(session.last_used_at)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Uses</span>
                <p className="font-medium">{session.use_count ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Rate Limits</span>
                <p className="font-medium">
                  {session.rate_limit_per_hour ?? 60}/hr,{" "}
                  {session.rate_limit_per_day ?? 500}/day
                </p>
              </div>
            </div>

            {/* Recent Errors */}
            {recentErrors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Recent Errors ({recentErrors.length})
                </p>
                <div className="space-y-1">
                  {recentErrors.map((error) => (
                    <div
                      key={error.id}
                      className="flex items-center justify-between text-[10px] bg-red-500/5 px-2 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[8px] uppercase tracking-widest text-red-500 border-red-500/50"
                        >
                          {error.error_type.replace("_", " ")}
                        </Badge>
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {error.error_message || "No details"}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0">
                        {formatRelativeTime(error.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encrypted indicator */}
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Cookie data encrypted • Cannot be viewed
            </div>
          </div>
        );
      })}
    </div>
  );
}
