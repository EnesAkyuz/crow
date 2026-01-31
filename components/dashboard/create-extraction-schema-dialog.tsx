"use client";

import { useState } from "react";
import { Plus, Trash2, FileJson, GripVertical } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createExtractionSchema } from "@/app/actions";
import { toast } from "sonner";

interface Field {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  description?: string;
}

interface CreateExtractionSchemaDialogProps {
  tenantId: string;
  tenantName: string;
}

export function CreateExtractionSchemaDialog({
  tenantId,
  tenantName,
}: CreateExtractionSchemaDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { name: "", type: "string", description: "" },
  ]);

  const addField = () => {
    setFields([...fields, { name: "", type: "string", description: "" }]);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    setFields(
      fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field,
      ),
    );
  };

  const handleSubmit = async () => {
    // Validate
    const validFields = fields.filter((f) => f.name.trim());
    if (!name.trim()) {
      toast.error("Schema name is required");
      return;
    }
    if (validFields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    // Check for duplicate field names
    const fieldNames = validFields.map((f) => f.name.trim().toLowerCase());
    if (new Set(fieldNames).size !== fieldNames.length) {
      toast.error("Field names must be unique");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("tenantId", tenantId);
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append(
      "fields",
      JSON.stringify(
        validFields.map((f) => ({
          name: f.name.trim(),
          type: f.type,
          description: f.description?.trim() || undefined,
        })),
      ),
    );

    const result = await createExtractionSchema(formData);

    setLoading(false);

    if (result.error) {
      toast.error(
        typeof result.error === "string"
          ? result.error
          : "Failed to create schema",
      );
      return;
    }

    toast.success("Extraction schema created");
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setFields([{ name: "", type: "string", description: "" }]);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const typeColors: Record<string, string> = {
    string: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    number: "bg-green-500/10 text-green-600 border-green-500/20",
    date: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    boolean: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] uppercase tracking-widest font-bold"
        >
          <FileJson className="w-3 h-3 mr-2" />
          New Schema
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-muted-foreground" />
            <DialogTitle className="uppercase tracking-widest text-sm font-bold">
              Create Extraction Schema
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-widest">
            Define fields to extract from documents for{" "}
            <span className="font-bold">{tenantName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Schema Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="schemaName"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Schema Name
              </Label>
              <Input
                id="schemaName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Invoice Parser, Contract Extractor"
                className="font-medium"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="schemaDesc"
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Description (optional)
              </Label>
              <Textarea
                id="schemaDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of documents will this extract from?"
                rows={2}
              />
            </div>
          </div>

          {/* Fields Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Fields to Extract
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {fields.filter((f) => f.name.trim()).length} field
                {fields.filter((f) => f.name.trim()).length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 border rounded-lg bg-muted/20 group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-2.5 shrink-0" />

                  <div className="flex-1 grid gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, { name: e.target.value })
                        }
                        placeholder="field_name"
                        className="flex-1 font-mono text-sm"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          updateField(index, {
                            type: v as Field["type"],
                          })
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 ${typeColors.string}`}
                              >
                                ABC
                              </Badge>
                              String
                            </span>
                          </SelectItem>
                          <SelectItem value="number">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 ${typeColors.number}`}
                              >
                                123
                              </Badge>
                              Number
                            </span>
                          </SelectItem>
                          <SelectItem value="date">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 ${typeColors.date}`}
                              >
                                DATE
                              </Badge>
                              Date
                            </span>
                          </SelectItem>
                          <SelectItem value="boolean">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 ${typeColors.boolean}`}
                              >
                                Y/N
                              </Badge>
                              Boolean
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={field.description || ""}
                      onChange={(e) =>
                        updateField(index, { description: e.target.value })
                      }
                      placeholder="Description / hint for AI (optional)"
                      className="text-sm text-muted-foreground"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(index)}
                    disabled={fields.length === 1}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addField}
              className="w-full text-[10px] uppercase tracking-widest font-bold"
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Field
            </Button>
          </div>

          {/* Preview */}
          {fields.some((f) => f.name.trim()) && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Output Preview
              </Label>
              <pre className="p-3 border rounded-lg bg-muted/40 text-[11px] font-mono overflow-auto">
                {JSON.stringify(
                  Object.fromEntries(
                    fields
                      .filter((f) => f.name.trim())
                      .map((f) => [
                        f.name,
                        f.type === "number"
                          ? 0
                          : f.type === "boolean"
                            ? false
                            : f.type === "date"
                              ? "2024-01-01"
                              : "...",
                      ]),
                  ),
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading || !name.trim() || !fields.some((f) => f.name.trim())
            }
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            {loading ? "Creating..." : "Create Schema"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
