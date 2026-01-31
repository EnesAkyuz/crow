"use client";

import { useState } from "react";
import {
  FileJson,
  Lock,
  Trash2,
  MoreHorizontal,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  Bug,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteExtractionSchema,
  toggleExtractionSchemaActive,
} from "@/app/actions";
import { ExtractDocumentDialog } from "./extract-document-dialog";
import { ExtractWebDialog } from "./extract-web-dialog";
import { toast } from "sonner";

// Check if we're in development mode (client-side check)
const isDev = process.env.NODE_ENV === "development";

interface Field {
  name: string;
  type: string;
  description?: string;
}

interface Extraction {
  id: string;
  source_filename: string;
  status: string;
  field_names: string[];
  extracted_at: string | null;
  created_at: string;
}

interface ExtractionSchema {
  id: string;
  name: string;
  description: string | null;
  fields: Field[];
  is_active: boolean;
  created_at: string;
  document_extractions?: Extraction[];
}

interface VaultSession {
  id: string;
  name: string;
  is_active: boolean | null;
}

interface ExtractionSchemaListProps {
  schemas: ExtractionSchema[];
  vaultSessions?: VaultSession[];
}

export function ExtractionSchemaList({
  schemas,
  vaultSessions = [],
}: ExtractionSchemaListProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<{
    open: boolean;
    data: Record<string, unknown> | null;
    source: string;
    loading: boolean;
  }>({ open: false, data: null, source: "", loading: false });

  const handleDebugView = async (extractionId: string, source: string) => {
    if (!isDev) return;
    setDebugData({ open: true, data: null, source, loading: true });
    try {
      const res = await fetch(`/api/debug/extraction?id=${extractionId}`);
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        setDebugData((prev) => ({ ...prev, loading: false }));
      } else {
        setDebugData({ open: true, data: json.data, source, loading: false });
      }
    } catch {
      toast.error("Failed to load debug data");
      setDebugData((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleExpanded = (schemaId: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schemaId)) {
        next.delete(schemaId);
      } else {
        next.add(schemaId);
      }
      return next;
    });
  };

  const handleToggleActive = async (
    schemaId: string,
    currentActive: boolean,
  ) => {
    setLoading(schemaId);
    const formData = new FormData();
    formData.append("schemaId", schemaId);
    formData.append("isActive", (!currentActive).toString());

    const result = await toggleExtractionSchemaActive(formData);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(currentActive ? "Schema paused" : "Schema activated");
    }
  };

  const handleDelete = async (schemaId: string) => {
    if (!confirm("Delete this schema and all its extractions?")) return;

    setLoading(schemaId);
    const formData = new FormData();
    formData.append("schemaId", schemaId);

    const result = await deleteExtractionSchema(formData);
    setLoading(null);

    if (result.error) {
      toast.error(
        typeof result.error === "string" ? result.error : "Failed to delete",
      );
    } else {
      toast.success("Schema deleted");
    }
  };

  const typeColors: Record<string, string> = {
    string: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    number: "bg-green-500/10 text-green-600 border-green-500/20",
    date: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    boolean: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  const statusColors: Record<string, string> = {
    completed: "bg-green-500/10 text-green-600",
    processing: "bg-blue-500/10 text-blue-600",
    pending: "bg-yellow-500/10 text-yellow-600",
    failed: "bg-red-500/10 text-red-600",
  };

  if (schemas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileJson className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-sm uppercase tracking-widest">
          No extraction schemas yet
        </p>
        <p className="text-xs mt-1 opacity-60">
          Create a schema to define what data to extract from documents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schemas.map((schema) => {
        const fields = schema.fields as Field[];
        const extractions = schema.document_extractions || [];
        const isExpanded = expandedSchemas.has(schema.id);
        const isLoading = loading === schema.id;

        return (
          <div
            key={schema.id}
            className={`border rounded-lg overflow-hidden transition-colors ${
              !schema.is_active ? "opacity-60 bg-muted/20" : ""
            }`}
          >
            {/* Schema Header */}
            <div className="p-4 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(schema.id)}
                    className="mt-1 p-0.5 hover:bg-muted rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h4 className="font-bold text-sm uppercase tracking-widest truncate">
                        {schema.name}
                      </h4>
                      {!schema.is_active && (
                        <Badge variant="secondary" className="text-[9px]">
                          Paused
                        </Badge>
                      )}
                    </div>

                    {schema.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {schema.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {fields.slice(0, 5).map((field) => (
                        <Badge
                          key={field.name}
                          variant="outline"
                          className={`text-[9px] font-mono ${typeColors[field.type] || ""}`}
                        >
                          {field.name}
                        </Badge>
                      ))}
                      {fields.length > 5 && (
                        <Badge variant="outline" className="text-[9px]">
                          +{fields.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {extractions.length} extraction
                    {extractions.length !== 1 ? "s" : ""}
                  </Badge>

                  <ExtractWebDialog
                    schema={schema}
                    vaultSessions={vaultSessions.map((s) => ({
                      id: s.id,
                      name: s.name,
                      is_active: s.is_active ?? false,
                    }))}
                  />
                  <ExtractDocumentDialog schema={schema} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isLoading}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleToggleActive(schema.id, schema.is_active)
                        }
                      >
                        {schema.is_active ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" /> Pause Schema
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" /> Activate Schema
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(schema.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Schema
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Extractions Table (Expanded) */}
            {isExpanded && (
              <div className="border-t bg-muted/20">
                {extractions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-widest">
                          Document
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest">
                          Status
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest">
                          Fields
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest">
                          Extracted
                        </TableHead>
                        {isDev && (
                          <TableHead className="text-[10px] uppercase tracking-widest w-[60px]">
                            Debug
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractions.map((extraction) => (
                        <TableRow key={extraction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-xs truncate max-w-[200px]">
                                {extraction.source_filename}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] uppercase ${statusColors[extraction.status] || ""}`}
                            >
                              {extraction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Lock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {extraction.field_names.length} encrypted
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {extraction.extracted_at
                                ? new Date(
                                    extraction.extracted_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </TableCell>
                          {isDev && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  handleDebugView(
                                    extraction.id,
                                    extraction.source_filename,
                                  )
                                }
                                disabled={extraction.status !== "completed"}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs uppercase tracking-widest">
                      No extractions yet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Debug Dialog - DEV ONLY */}
      {isDev && (
        <Dialog
          open={debugData.open}
          onOpenChange={(open) => setDebugData((prev) => ({ ...prev, open }))}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-widest text-sm font-bold flex items-center gap-2">
                <Bug className="w-4 h-4 text-orange-500" />
                Debug: Extracted Values
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Source: {debugData.source}
              </div>
              {debugData.loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : debugData.data ? (
                <div className="bg-muted/50 p-4 rounded-lg overflow-auto max-h-[400px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(debugData.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No data available
                </div>
              )}
              <div className="flex items-center gap-2 text-[9px] text-orange-500 uppercase tracking-wider">
                <Bug className="w-3 h-3" />
                Development only — this data is encrypted in production
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
