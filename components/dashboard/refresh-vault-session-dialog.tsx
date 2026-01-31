"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { refreshVaultSession } from "@/app/actions";
import {
  parseCookieExpiration,
  formatExpirationInfo,
  getSuggestedExpiration,
} from "@/lib/cookie-parser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface RefreshVaultSessionDialogProps {
  sessionId: string;
  sessionName: string;
}

export function RefreshVaultSessionDialog({
  sessionId,
  sessionName,
}: RefreshVaultSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expirationInfo, setExpirationInfo] = useState<string | null>(null);
  const [detectedExpiry, setDetectedExpiry] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();

  const handleCookieChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const cookieData = e.target.value;
      if (!cookieData.trim()) {
        setExpirationInfo(null);
        setDetectedExpiry(null);
        setIsExpired(false);
        return;
      }

      const info = parseCookieExpiration(cookieData);
      setExpirationInfo(formatExpirationInfo(info));
      setDetectedExpiry(getSuggestedExpiration(cookieData));
      setIsExpired(info.isExpired);

      // Auto-fill the expiration field if we detected one
      if (info.expiresAt && !info.isExpired) {
        const expiresInput = document.getElementById(
          "refresh-expiresAt",
        ) as HTMLInputElement;
        if (expiresInput) {
          expiresInput.value = info.expiresAt.toISOString().slice(0, 16);
        }
      }
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("sessionId", sessionId);

    const result = await refreshVaultSession(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setExpirationInfo(null);
    setDetectedExpiry(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[10px] text-blue-500 uppercase font-bold hover:underline">
          Refresh
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold">
            Refresh Session Cookie
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase tracking-widest">
            Update the cookie data for "{sessionName}". The old cookie will be
            replaced.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="cookieData"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                New Cookie Data
              </Label>
              <Textarea
                id="cookieData"
                name="cookieData"
                placeholder="auth-token=eyJhbGciOiJIUzI1NiIs...; session_id=abc123"
                className="text-sm font-mono min-h-[100px]"
                onChange={handleCookieChange}
                required
              />
              {expirationInfo && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isExpired ? "destructive" : "secondary"}
                    className="text-[8px] uppercase tracking-widest"
                  >
                    {isExpired ? "Expired" : "Expiration Detected"}
                  </Badge>
                  <span
                    className={`text-[9px] uppercase tracking-wider ${isExpired ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {expirationInfo}
                  </span>
                </div>
              )}
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Paste the fresh cookie string from DevTools. JWT expiration will
                be auto-detected.
              </p>
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="refresh-expiresAt"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                New Expiration Date{" "}
                {detectedExpiry && (
                  <span className="text-green-600">(auto-detected)</span>
                )}
              </Label>
              <Input
                id="refresh-expiresAt"
                name="expiresAt"
                type="datetime-local"
                className="text-sm"
              />
            </div>

            {error && (
              <p className="text-[10px] uppercase tracking-widest text-red-500">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-[10px] uppercase tracking-widest"
            >
              {loading ? "Encrypting..." : "Update Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
