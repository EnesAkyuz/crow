"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  ImageIcon,
  FileText,
  AlertCircle,
  Clock,
  Globe,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

interface TestScrapeDialogProps {
  sessionId: string;
  sessionName: string;
}

interface ScrapeResult {
  success: boolean;
  data?: {
    success?: boolean;
    data?: {
      markdown?: string;
      screenshot?: string;
      metadata?: {
        title?: string;
        description?: string;
        statusCode?: number;
      };
    };
  };
  error?: string;
  details?: unknown;
  duration?: number;
}

export function TestScrapeDialog({
  sessionId,
  sessionName,
}: TestScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    "preview" | "screenshot" | "metadata"
  >("preview");

  async function handleTest() {
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/scrape-with-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          url: url.trim(),
          formats: ["markdown", "screenshot"],
          waitFor: 3000,
        }),
      });

      const data = await response.json();
      setResult(data);
      if (data.success) {
        setActiveTab("preview");
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <button className="text-[10px] text-green-600 uppercase font-bold hover:underline">
          Test
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <DialogTitle className="uppercase tracking-widest text-sm font-bold">
              Test Scrape
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-widest flex items-center gap-2">
            Session:{" "}
            <Badge variant="outline" className="h-5 text-[10px]">
              {sessionName}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Input Section */}
              <div className="flex gap-3 items-end">
                <div className="grid gap-2 flex-1">
                  <Label
                    htmlFor="testUrl"
                    className="text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    Target URL
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="testUrl"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/dashboard"
                      className="pl-9 font-mono text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleTest()}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTest}
                  disabled={loading || !url.trim()}
                  className="uppercase tracking-widest text-[10px] font-bold min-w-[100px]"
                >
                  {loading ? "Running..." : "Start Test"}
                </Button>
              </div>

              {/* Results Section */}
              {result && (
                <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 space-y-6">
                  <Separator />

                  {/* Status Card */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Status
                        </span>
                        <Badge
                          variant={result.success ? "default" : "destructive"}
                          className="w-fit uppercase tracking-widest text-[10px] px-2 py-0.5"
                        >
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                      </div>

                      {result.duration && (
                        <>
                          <Separator orientation="vertical" className="h-8" />
                          <div className="grid gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Time
                            </span>
                            <div className="flex items-center gap-1.5 text-sm font-mono font-medium">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {result.duration}ms
                            </div>
                          </div>
                        </>
                      )}

                      {result.data?.data?.metadata?.statusCode && (
                        <>
                          <Separator orientation="vertical" className="h-8" />
                          <div className="grid gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Code
                            </span>
                            <span className="text-sm font-mono font-medium">
                              {result.data.data.metadata.statusCode}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Error Display */}
                  {result.error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
                      <div className="flex items-center gap-2 font-medium mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Scraping Failed
                      </div>
                      <p className="text-sm opacity-90">{result.error}</p>
                      {result.details && (
                        <pre className="mt-4 text-[10px] bg-background/50 p-2 rounded overflow-auto max-h-[200px] whitespace-pre-wrap break-all font-mono text-foreground">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Success Content */}
                  {result.success && result.data?.data && (
                    <div className="space-y-4">
                      {/* Custom Tabs */}
                      <div className="border-b">
                        <div className="flex gap-6">
                          <button
                            onClick={() => setActiveTab("preview")}
                            data-active={activeTab === "preview"}
                            className="pb-2 border-b-2 border-transparent data-[active=true]:border-primary text-[10px] uppercase tracking-widest font-bold text-muted-foreground data-[active=true]:text-foreground transition-colors hover:text-foreground flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" /> Content
                          </button>
                          <button
                            onClick={() => setActiveTab("screenshot")}
                            data-active={activeTab === "screenshot"}
                            className="pb-2 border-b-2 border-transparent data-[active=true]:border-primary text-[10px] uppercase tracking-widest font-bold text-muted-foreground data-[active=true]:text-foreground transition-colors hover:text-foreground flex items-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> Screenshot
                          </button>
                          <button
                            onClick={() => setActiveTab("metadata")}
                            data-active={activeTab === "metadata"}
                            className="pb-2 border-b-2 border-transparent data-[active=true]:border-primary text-[10px] uppercase tracking-widest font-bold text-muted-foreground data-[active=true]:text-foreground transition-colors hover:text-foreground flex items-center gap-2"
                          >
                            <Terminal className="w-4 h-4" /> Metadata
                          </button>
                        </div>
                      </div>

                      {/* Content Tab */}
                      {activeTab === "preview" && (
                        <div className="rounded-lg border bg-muted/40 p-1">
                          <div className="rounded border bg-background overflow-hidden relative group">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    result?.data?.data?.markdown || "",
                                  )
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="overflow-auto max-h-[500px] w-full p-4">
                              <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
                                {result.data.data.markdown ||
                                  "No markdown content returned."}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Screenshot Tab */}
                      {activeTab === "screenshot" && (
                        <div className="rounded-lg border bg-muted/40 p-4 flex justify-center min-h-[300px] items-center">
                          {result.data.data.screenshot ? (
                            <img
                              src={result.data.data.screenshot}
                              alt="Scrape screenshot"
                              className="max-w-full h-auto rounded shadow-sm border max-h-[600px] object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                              <ImageIcon className="w-8 h-8 opacity-20" />
                              No screenshot available
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata Tab */}
                      {activeTab === "metadata" && (
                        <div className="grid gap-4">
                          <div className="grid gap-1">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Title
                            </Label>
                            <div className="p-3 border rounded-md bg-muted/30 text-sm font-medium">
                              {result.data.data.metadata?.title || "N/A"}
                            </div>
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Description
                            </Label>
                            <div className="p-3 border rounded-md bg-muted/30 text-sm text-muted-foreground">
                              {result.data.data.metadata?.description || "N/A"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!result && !loading && (
                <div className="py-20 text-center text-muted-foreground opacity-50">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm uppercase tracking-widest">
                    Ready to Test Scrape
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
