"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Globe,
  FileText,
  ArrowRight,
  Send,
  Play,
  Loader2,
  Sparkles,
  GripVertical,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type StepType = "web_scrape" | "document_extract" | "webhook" | "email";

interface WorkflowStep {
  id: string;
  type: StepType;
  config: Record<string, any>;
}

interface Schema {
  id: string;
  name: string;
}

interface VaultSession {
  id: string;
  name: string;
}

interface WorkflowBuilderProps {
  tenantId: string;
  tenantName: string;
  schemas: Schema[];
  vaultSessions: VaultSession[];
  onSave?: (workflow: { name: string; steps: WorkflowStep[] }) => void;
}

const stepTypeInfo: Record<
  StepType,
  { label: string; icon: any; color: string }
> = {
  web_scrape: {
    label: "Web Scrape",
    icon: Globe,
    color: "text-green-600 bg-green-500/10",
  },
  document_extract: {
    label: "Document",
    icon: FileText,
    color: "text-purple-600 bg-purple-500/10",
  },
  webhook: {
    label: "Webhook",
    icon: Send,
    color: "text-blue-600 bg-blue-500/10",
  },
  email: {
    label: "Email",
    icon: Send,
    color: "text-orange-600 bg-orange-500/10",
  },
};

function StepCard({
  step,
  index,
  schemas,
  vaultSessions,
  onUpdate,
  onDelete,
  isLast,
}: {
  step: WorkflowStep;
  index: number;
  schemas: Schema[];
  vaultSessions: VaultSession[];
  onUpdate: (config: Record<string, any>) => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const info = stepTypeInfo[step.type];
  const Icon = info.icon;

  return (
    <div className="relative">
      <div className="border border-border/50 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground/40" />
              <Badge variant="outline" className="text-[10px] font-bold">
                {index + 1}
              </Badge>
            </div>
            <div className={`p-2 rounded-none ${info.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              {info.label}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {step.type === "web_scrape" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                URL to Scrape
              </Label>
              <Input
                value={step.config.url || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, url: e.target.value })
                }
                placeholder="https://example.com/data"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Schema
              </Label>
              <Select
                value={step.config.schemaId || ""}
                onValueChange={(v) => onUpdate({ ...step.config, schemaId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Vault Session (optional)
              </Label>
              <Select
                value={step.config.sessionId || "none"}
                onValueChange={(v) =>
                  onUpdate({
                    ...step.config,
                    sessionId: v === "none" ? undefined : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No auth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No authentication</SelectItem>
                  {vaultSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={step.config.enableHandoff ?? true}
                onCheckedChange={(v) =>
                  onUpdate({ ...step.config, enableHandoff: v })
                }
              />
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                Auto-extract PDFs found on page
              </Label>
            </div>
          </div>
        )}

        {step.type === "document_extract" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Schema
              </Label>
              <Select
                value={step.config.schemaId || ""}
                onValueChange={(v) => onUpdate({ ...step.config, schemaId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Documents can be uploaded when running the workflow
            </p>
          </div>
        )}

        {step.type === "webhook" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Webhook URL
              </Label>
              <Input
                value={step.config.webhookUrl || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, webhookUrl: e.target.value })
                }
                placeholder="https://your-api.com/webhook"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Extracted data will be POSTed to this URL as JSON
            </p>
          </div>
        )}

        {step.type === "email" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Email Address
              </Label>
              <Input
                type="email"
                value={step.config.email || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, email: e.target.value })
                }
                placeholder="team@company.com"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Extraction results will be emailed to this address
            </p>
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex justify-center py-2">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function WorkflowBuilder({
  tenantId,
  tenantName,
  schemas,
  vaultSessions,
  onSave,
}: WorkflowBuilderProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [running, setRunning] = useState(false);

  const addStep = (type: StepType) => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        type,
        config: type === "web_scrape" ? { enableHandoff: true } : {},
      },
    ]);
  };

  const updateStep = (id: string, config: Record<string, any>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, config } : s)));
  };

  const deleteStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const runWorkflow = async () => {
    if (steps.length === 0) {
      toast.error("Add at least one step to run the workflow");
      return;
    }

    setRunning(true);
    let lastResult: any = null;

    try {
      for (const step of steps) {
        if (step.type === "web_scrape") {
          if (!step.config.url || !step.config.schemaId) {
            toast.error("Web scrape step requires URL and schema");
            setRunning(false);
            return;
          }

          const response = await fetch("/api/extract-web-agentic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: step.config.url,
              schemaId: step.config.schemaId,
              sessionId: step.config.sessionId,
              enableHandoff: step.config.enableHandoff,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            toast.error(data.error || "Web scrape failed");
            setRunning(false);
            return;
          }

          lastResult = data;
          toast.success(`Step completed: Web scrape`);

          if (data.handoff?.successful > 0) {
            toast.success(
              `🪄 Agentic handoff: Extracted ${data.handoff.successful} PDF(s)`,
            );
          }
        }

        if (step.type === "webhook" && lastResult) {
          if (!step.config.webhookUrl) {
            toast.error("Webhook step requires a URL");
            setRunning(false);
            return;
          }

          try {
            await fetch(step.config.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lastResult),
            });
            toast.success("Webhook delivered");
          } catch {
            toast.error("Webhook delivery failed");
          }
        }

        if (step.type === "email" && lastResult) {
          toast.info(
            "Email notification would be sent (not implemented in demo)",
          );
        }
      }

      toast.success("Workflow completed!");
    } catch (err) {
      toast.error("Workflow failed");
    } finally {
      setRunning(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSteps([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] uppercase tracking-widest font-bold"
        >
          <Play className="w-3 h-3 mr-2" />
          Build Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-muted-foreground" />
            <DialogTitle className="uppercase tracking-widest text-sm font-bold">
              Visual Workflow Builder
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-widest">
            Create automated extraction pipelines for{" "}
            <span className="font-bold">{tenantName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Workflow Name */}
          <div className="grid gap-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Workflow Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Invoice Extraction"
            />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Workflow Steps
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {steps.length} step{steps.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {steps.length === 0 ? (
              <div className="border border-dashed border-border/50 p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Add steps to build your workflow
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    schemas={schemas}
                    vaultSessions={vaultSessions}
                    onUpdate={(config) => updateStep(step.id, config)}
                    onDelete={() => deleteStep(step.id)}
                    isLast={index === steps.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Add Step Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addStep("web_scrape")}
                className="text-[10px] uppercase tracking-widest"
              >
                <Globe className="w-3 h-3 mr-2 text-green-600" />
                Add Web Scrape
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addStep("webhook")}
                className="text-[10px] uppercase tracking-widest"
              >
                <Send className="w-3 h-3 mr-2 text-blue-600" />
                Add Webhook
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addStep("email")}
                className="text-[10px] uppercase tracking-widest"
              >
                <Send className="w-3 h-3 mr-2 text-orange-600" />
                Add Email
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={runWorkflow}
            disabled={running || steps.length === 0}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            {running ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-2" />
                Run Workflow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
