"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Check, Lock, Globe } from "lucide-react";
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

interface ExtractDocumentDialogProps {
  schema: ExtractionSchema;
}

type ExtractStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

interface ExtractResult {
  success: boolean;
  extractionId?: string;
  fieldNames?: string[];
  error?: string;
}

export function ExtractDocumentDialog({ schema }: ExtractDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExtractStatus>("idle");
  const [documentUrl, setDocumentUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setDocumentUrl("");
    }
  };

  const handleExtract = async () => {
    if (!selectedFile && !documentUrl.trim()) {
      toast.error("Please upload a file or provide a URL");
      return;
    }

    setStatus("uploading");
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        schemaId: schema.id,
        filename:
          selectedFile?.name ||
          new URL(documentUrl).pathname.split("/").pop() ||
          "document",
      };

      if (selectedFile) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        payload.documentBase64 = base64;
      } else {
        payload.documentUrl = documentUrl.trim();
      }

      setStatus("processing");

      const response = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus("error");
        setResult({ success: false, error: data.error || "Extraction failed" });
        return;
      }

      setStatus("completed");
      setResult({
        success: true,
        extractionId: data.extractionId,
        fieldNames: data.fieldNames,
      });
    } catch (error) {
      setStatus("error");
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStatus("idle");
    setResult(null);
    setSelectedFile(null);
    setDocumentUrl("");
  };

  const fields = schema.fields as Field[];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-[10px] text-primary uppercase font-bold hover:underline"
        >
          Extract
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <DialogTitle className="uppercase tracking-widest text-sm font-bold">
              Extract Document
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-widest flex items-center gap-2">
            Using schema:{" "}
            <Badge variant="outline" className="h-5 text-[10px]">
              {schema.name}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schema Fields Preview */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Fields to Extract
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {fields.map((field) => (
                <Badge
                  key={field.name}
                  variant="secondary"
                  className="text-[10px] font-mono"
                >
                  {field.name}
                  <span className="ml-1 opacity-50">({field.type})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Upload Section */}
          {status === "idle" && (
            <>
              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Upload Document
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors hover:border-primary/50 hover:bg-muted/50
                    ${selectedFile ? "border-primary bg-primary/5" : "border-border"}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-sm">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload PDF or image
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Max 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Or Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  or
                </span>
                <div className="flex-1 border-t" />
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="docUrl"
                  className="text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Document URL
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="docUrl"
                    value={documentUrl}
                    onChange={(e) => {
                      setDocumentUrl(e.target.value);
                      if (e.target.value) setSelectedFile(null);
                    }}
                    placeholder="https://example.com/document.pdf"
                    className="pl-9 font-mono text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Processing State */}
          {(status === "uploading" || status === "processing") && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {status === "uploading"
                  ? "Uploading document..."
                  : "Extracting data..."}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                Data will be encrypted immediately after extraction
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium text-green-700">
                    Extraction Complete
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.fieldNames?.length} fields extracted and encrypted
                  </p>

                  <div className="mt-4 p-3 rounded-md bg-muted/50 text-left">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                      <Lock className="w-3 h-3" />
                      Encrypted Fields
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.fieldNames?.map((name) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className="text-[10px] font-mono"
                        >
                          {name}: ●●●●●●
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-4">
                    Extraction ID:{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {result.extractionId}
                    </code>
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                  <p className="font-medium text-destructive">
                    Extraction Failed
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {status === "idle" && (
            <Button
              onClick={handleExtract}
              disabled={!selectedFile && !documentUrl.trim()}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              <Lock className="w-3 h-3 mr-2" />
              Extract & Encrypt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
