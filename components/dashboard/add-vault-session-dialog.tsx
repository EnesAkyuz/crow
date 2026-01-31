"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createVaultSession } from "@/app/actions";
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

interface AddVaultSessionDialogProps {
  tenantId: string;
  tenantName: string;
}

export function AddVaultSessionDialog({
  tenantId,
  tenantName,
}: AddVaultSessionDialogProps) {
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
          "expiresAt",
        ) as HTMLInputElement;
        if (expiresInput && !expiresInput.value) {
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
    formData.set("tenantId", tenantId);

    const result = await createVaultSession(formData);

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
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] uppercase tracking-widest font-bold"
        >
          Add Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold">
            Add Vault Session
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase tracking-widest">
            Store session cookies for {tenantName} to enable authenticated
            scraping.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Session Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Portal Login, Admin Dashboard"
                className="text-sm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="description"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Description (optional)
              </Label>
              <Input
                id="description"
                name="description"
                placeholder="Brief description of this session"
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="cookieData"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Cookie Data
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
                Format: <code className="bg-muted px-1">cookie-name=value</code>{" "}
                or multiple:{" "}
                <code className="bg-muted px-1">
                  name1=value1; name2=value2
                </code>
                . Copy from DevTools → Application → Cookies.
              </p>
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="expiresAt"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Expiration Date{" "}
                {detectedExpiry && (
                  <span className="text-green-600">(auto-detected)</span>
                )}
              </Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
                className="text-sm"
                defaultValue={detectedExpiry || undefined}
              />
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {detectedExpiry
                  ? "Detected from cookie. Adjust if needed."
                  : "Set when this session will expire. You'll be notified before expiration."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="rateLimitPerHour"
                  className="text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Hourly Rate Limit
                </Label>
                <Input
                  id="rateLimitPerHour"
                  name="rateLimitPerHour"
                  type="number"
                  min="1"
                  max="1000"
                  defaultValue="60"
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="rateLimitPerDay"
                  className="text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Daily Rate Limit
                </Label>
                <Input
                  id="rateLimitPerDay"
                  name="rateLimitPerDay"
                  type="number"
                  min="1"
                  max="10000"
                  defaultValue="500"
                  className="text-sm"
                />
              </div>
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
              {loading ? "Encrypting..." : "Save Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
