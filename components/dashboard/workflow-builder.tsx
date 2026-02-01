"use client";

import { useState } from "react";
import {
  Trash2,
  Globe,
  FileText,
  ArrowRight,
  Send,
  Play,
  Loader2,
  Sparkles,
  GripVertical,
  Bot,
  Map as MapIcon,
  Layers,
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

type StepType =
  | "web_scrape"
  | "web_crawl"
  | "web_map"
  | "agent_extract"
  | "document_extract"
  | "webhook"
  | "email";

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
  { label: string; icon: any; color: string; description: string }
> = {
  web_scrape: {
    label: "Web Scrape",
    icon: Globe,
    color: "text-green-600 bg-green-500/10",
    description: "Scrape a single page with structured extraction",
  },
  web_crawl: {
    label: "Web Crawl",
    icon: Layers,
    color: "text-cyan-600 bg-cyan-500/10",
    description: "Crawl multiple pages from a starting URL",
  },
  web_map: {
    label: "Site Map",
    icon: MapIcon,
    color: "text-indigo-600 bg-indigo-500/10",
    description: "Discover all URLs on a website",
  },
  agent_extract: {
    label: "AI Agent",
    icon: Bot,
    color: "text-purple-600 bg-purple-500/10",
    description: "FIRE-1 agent for complex multi-page extraction",
  },
  document_extract: {
    label: "Document",
    icon: FileText,
    color: "text-orange-600 bg-orange-500/10",
    description: "Extract from PDFs and documents",
  },
  webhook: {
    label: "Webhook",
    icon: Send,
    color: "text-blue-600 bg-blue-500/10",
    description: "POST extracted data to a URL",
  },
  email: {
    label: "Email",
    icon: Send,
    color: "text-rose-600 bg-rose-500/10",
    description: "Send results via email",
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

        {/* Web Crawl Step */}
        {step.type === "web_crawl" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Starting URL
              </Label>
              <Input
                value={step.config.url || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, url: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Page Limit
                </Label>
                <Input
                  type="number"
                  value={step.config.limit || 10}
                  onChange={(e) =>
                    onUpdate({
                      ...step.config,
                      limit: parseInt(e.target.value) || 10,
                    })
                  }
                  min={1}
                  max={1000}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Max Depth
                </Label>
                <Input
                  type="number"
                  value={step.config.maxDepth || 3}
                  onChange={(e) =>
                    onUpdate({
                      ...step.config,
                      maxDepth: parseInt(e.target.value) || 3,
                    })
                  }
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Schema (optional)
              </Label>
              <Select
                value={step.config.schemaId || "none"}
                onValueChange={(v) =>
                  onUpdate({
                    ...step.config,
                    schemaId: v === "none" ? undefined : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No schema (raw markdown)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No schema (raw markdown)</SelectItem>
                  {schemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={step.config.allowSubdomains ?? false}
                onCheckedChange={(v) =>
                  onUpdate({ ...step.config, allowSubdomains: v })
                }
              />
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Include subdomains
              </Label>
            </div>
          </div>
        )}

        {/* Site Map Step */}
        {step.type === "web_map" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Website URL
              </Label>
              <Input
                value={step.config.url || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, url: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Search Query (optional)
              </Label>
              <Input
                value={step.config.search || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, search: e.target.value })
                }
                placeholder="e.g., pricing, docs, blog"
              />
              <p className="text-[10px] text-muted-foreground">
                Filter discovered URLs by keyword
              </p>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                URL Limit
              </Label>
              <Input
                type="number"
                value={step.config.limit || 100}
                onChange={(e) =>
                  onUpdate({
                    ...step.config,
                    limit: parseInt(e.target.value) || 100,
                  })
                }
                min={1}
                max={5000}
              />
            </div>
          </div>
        )}

        {/* AI Agent Step */}
        {step.type === "agent_extract" && (
          <div className="space-y-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">
                  FIRE-1 Agent
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                AI agent that navigates complex sites, follows links, and
                extracts data autonomously
              </p>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Target URLs (one per line, or use wildcards like /*)
              </Label>
              <Textarea
                value={step.config.urls || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, urls: e.target.value })
                }
                placeholder="https://example.com/*&#10;https://example.com/products"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Extraction Prompt
              </Label>
              <Textarea
                value={step.config.prompt || ""}
                onChange={(e) =>
                  onUpdate({ ...step.config, prompt: e.target.value })
                }
                placeholder="Extract all product information including name, price, description, and specifications"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Schema (optional)
              </Label>
              <Select
                value={step.config.schemaId || "none"}
                onValueChange={(v) =>
                  onUpdate({
                    ...step.config,
                    schemaId: v === "none" ? undefined : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Let AI decide structure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Let AI decide structure</SelectItem>
                  {schemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={step.config.enableWebSearch ?? false}
                onCheckedChange={(v) =>
                  onUpdate({ ...step.config, enableWebSearch: v })
                }
              />
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Enable web search for additional context
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
    let lastResult: unknown = null;

    try {
      for (const step of steps) {
        // ============ WEB SCRAPE ============
        if (step.type === "web_scrape") {
          if (!step.config.url || !step.config.schemaId) {
            toast.error("Web scrape step requires URL and schema");
            setRunning(false);
            return;
          }

          toast.info(`Running: Web Scrape → ${step.config.url}`);
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
          toast.success(`✓ Web scrape completed`);

          if (data.handoff?.successful > 0) {
            toast.success(
              `🪄 Agentic handoff: Extracted ${data.handoff.successful} PDF(s)`,
            );
          }
        }

        // ============ WEB CRAWL ============
        if (step.type === "web_crawl") {
          if (!step.config.url) {
            toast.error("Web crawl step requires a URL");
            setRunning(false);
            return;
          }

          toast.info(
            `Running: Web Crawl → ${step.config.url} (limit: ${step.config.limit || 10})`,
          );
          const response = await fetch("/api/crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: step.config.url,
              limit: step.config.limit || 10,
              maxDepth: step.config.maxDepth || 3,
              allowSubdomains: step.config.allowSubdomains || false,
              schemaId: step.config.schemaId,
              sessionId: step.config.sessionId,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            toast.error(data.error || "Web crawl failed");
            setRunning(false);
            return;
          }

          // Crawl is async - poll for results
          if (data.jobId) {
            toast.info(`Crawl job started: ${data.jobId}`);

            // Poll for completion (max 60 seconds)
            let attempts = 0;
            while (attempts < 30) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const statusRes = await fetch(`/api/crawl?jobId=${data.jobId}`);
              const statusData = await statusRes.json();

              if (statusData.status === "completed") {
                lastResult = statusData;
                toast.success(
                  `✓ Crawl completed: ${statusData.completed || 0} pages`,
                );
                break;
              } else if (statusData.status === "failed") {
                toast.error("Crawl failed");
                setRunning(false);
                return;
              }

              toast.info(
                `Crawling... ${statusData.completed || 0}/${statusData.total || "?"} pages`,
              );
              attempts++;
            }
          }
        }

        // ============ SITE MAP ============
        if (step.type === "web_map") {
          if (!step.config.url) {
            toast.error("Site map step requires a URL");
            setRunning(false);
            return;
          }

          toast.info(`Running: Site Map → ${step.config.url}`);
          const response = await fetch("/api/map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: step.config.url,
              search: step.config.search,
              limit: step.config.limit || 100,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            toast.error(data.error || "Site map failed");
            setRunning(false);
            return;
          }

          lastResult = data;
          toast.success(
            `✓ Site map completed: Found ${data.totalUrls || 0} URLs`,
          );
        }

        // ============ AI AGENT (FIRE-1) ============
        if (step.type === "agent_extract") {
          if (!step.config.urls || !step.config.prompt) {
            toast.error("AI Agent step requires URLs and a prompt");
            setRunning(false);
            return;
          }

          // Parse URLs from textarea (one per line)
          const urls = step.config.urls
            .split("\n")
            .map((u: string) => u.trim())
            .filter((u: string) => u.length > 0);

          if (urls.length === 0) {
            toast.error("AI Agent step requires at least one URL");
            setRunning(false);
            return;
          }

          toast.info(`Running: AI Agent (FIRE-1) → ${urls.length} URL(s)`);
          const response = await fetch("/api/agent-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urls,
              prompt: step.config.prompt,
              schemaId: step.config.schemaId,
              enableWebSearch: step.config.enableWebSearch || false,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            toast.error(data.error || "AI Agent extraction failed");
            setRunning(false);
            return;
          }

          // If async, poll for results
          if (data.async && data.jobId) {
            toast.info(`Agent job started: ${data.jobId}`);

            let attempts = 0;
            while (attempts < 60) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const statusRes = await fetch(
                `/api/agent-extract?jobId=${data.jobId}`,
              );
              const statusData = await statusRes.json();

              if (statusData.status === "completed") {
                lastResult = statusData;
                toast.success(`✓ AI Agent extraction completed`);
                break;
              } else if (statusData.status === "failed") {
                toast.error(statusData.error || "AI Agent extraction failed");
                setRunning(false);
                return;
              }

              toast.info(`Agent processing...`);
              attempts++;
            }
          } else {
            lastResult = data;
            toast.success(`✓ AI Agent extraction completed`);
          }
        }

        // ============ DOCUMENT EXTRACT ============
        if (step.type === "document_extract") {
          toast.info(
            "Document extraction: Upload documents in the Document Vault tab",
          );
          // Document uploads are handled separately via the Document Vault UI
        }

        // ============ WEBHOOK ============
        if (step.type === "webhook" && lastResult) {
          if (!step.config.webhookUrl) {
            toast.error("Webhook step requires a URL");
            setRunning(false);
            return;
          }

          toast.info(`Sending to webhook: ${step.config.webhookUrl}`);
          try {
            await fetch(step.config.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lastResult),
            });
            toast.success("✓ Webhook delivered");
          } catch {
            toast.error("Webhook delivery failed");
          }
        }

        // ============ EMAIL ============
        if (step.type === "email" && lastResult) {
          if (!step.config.email) {
            toast.error("Email step requires an email address");
            setRunning(false);
            return;
          }

          toast.info(`Sending results to: ${step.config.email}`);
          try {
            const emailRes = await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: step.config.email,
                subject: `Crow Workflow Results: ${name || "Unnamed Workflow"}`,
                body: `Your workflow has completed. Here are the results:\n\n${JSON.stringify(lastResult, null, 2)}`,
              }),
            });

            if (emailRes.ok) {
              toast.success("✓ Email sent");
            } else {
              toast.error("Email delivery failed");
            }
          } catch {
            toast.error("Email delivery failed");
          }
        }
      }

      toast.success("🎉 Workflow completed!");
    } catch {
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
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Data Sources
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("web_scrape")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Globe className="w-3 h-3 mr-2 text-green-600" />
                  Web Scrape
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("web_crawl")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Layers className="w-3 h-3 mr-2 text-cyan-600" />
                  Web Crawl
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("web_map")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <MapIcon className="w-3 h-3 mr-2 text-indigo-600" />
                  Site Map
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("agent_extract")}
                  className="text-[10px] uppercase tracking-widest border-purple-500/30 hover:border-purple-500/50"
                >
                  <Bot className="w-3 h-3 mr-2 text-purple-600" />
                  AI Agent
                  <Badge
                    variant="outline"
                    className="ml-2 text-[8px] py-0 px-1 border-purple-500/30 text-purple-500"
                  >
                    FIRE-1
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("document_extract")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <FileText className="w-3 h-3 mr-2 text-orange-600" />
                  Document
                </Button>
              </div>

              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-4">
                Actions
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("webhook")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Send className="w-3 h-3 mr-2 text-blue-600" />
                  Webhook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("email")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Send className="w-3 h-3 mr-2 text-rose-600" />
                  Email
                </Button>
              </div>
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
