"use client";

import { useState } from "react";
import { Globe, Loader2, Check, Lock, KeyRound } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Field {
  name: string;
  type: string;
  description?: string;
}

interface ExtractionSchema {
  id: string;
  name: string;
  fields: Field[];
}

interface VaultSession {
  id: string;
  name: string;
  is_active: boolean;
}

interface ExtractWebDialogProps {
  schema: ExtractionSchema;
  vaultSessions?: VaultSession[];
}

type ExtractStatus = "idle" | "processing" | "completed" | "error";

interface ExtractResult {
  success: boolean;
  extractionId?: string;
  fieldNames?: string[];
  error?: string;
}

export function ExtractWebDialog({
  schema,
  vaultSessions = [],
}: ExtractWebDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExtractStatus>("idle");
  const [url, setUrl] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [result, setResult] = useState<ExtractResult | null>(null);

  const activeSessions = vaultSessions.filter((s) => s.is_active);

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setStatus("processing");
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        schemaId: schema.id,
        url: url.trim(),
      };

      if (sessionId && sessionId !== "none") {
        payload.sessionId = sessionId;
      }

      const response = await fetch("/api/extract-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ExtractResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Extraction failed");
      }

      setResult(data);
      setStatus("completed");
      toast.success("Web extraction completed!");
    } catch (err) {
      setStatus("error");
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setStatus("idle");
      setUrl("");
      setSessionId("");
      setResult(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] uppercase tracking-widest font-bold h-7"
        >
          <Globe className="w-3 h-3 mr-1" />
          Web
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Extract from Web
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase tracking-widest">
            Scrape and extract data from a URL using schema:{" "}
            <span className="font-bold">{schema.name}</span>
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="url"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Target URL
              </Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="text-sm font-mono"
              />
            </div>

            {activeSessions.length > 0 && (
              <div className="grid gap-2">
                <Label
                  htmlFor="session"
                  className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  Vault Session (optional)
                </Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="No authentication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No authentication</SelectItem>
                    {activeSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Use a vault session to scrape pages behind a login
                </p>
              </div>
            )}

            <div className="border border-border/50 p-3">
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Fields to Extract
              </h4>
              <div className="flex flex-wrap gap-1">
                {schema.fields.map((field) => (
                  <Badge
                    key={field.name}
                    variant="secondary"
                    className="text-[9px] uppercase tracking-wider"
                  >
                    {field.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <Globe className="w-12 h-12 text-muted-foreground" />
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest">
                Extracting Data
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                Firecrawl is scraping and extracting...
              </p>
            </div>
          </div>
        )}

        {status === "completed" && result?.success && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest">
                Extraction Complete
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                {result.fieldNames?.length || 0} fields extracted and encrypted
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              Data stored securely in vault
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center">
              <Globe className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-red-500">
                Extraction Failed
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                {result?.error || "Unknown error occurred"}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {status === "idle" && (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-[10px] uppercase tracking-widest font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExtract}
                disabled={!url.trim()}
                className="text-[10px] uppercase tracking-widest font-bold"
              >
                <Globe className="w-3 h-3 mr-2" />
                Extract
              </Button>
            </>
          )}
          {(status === "completed" || status === "error") && (
            <Button
              onClick={handleClose}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              {status === "completed" ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
