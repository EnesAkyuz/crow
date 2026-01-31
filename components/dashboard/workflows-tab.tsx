"use client";

import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Trash2,
  Globe,
  FileText,
  ArrowDown,
  ArrowRight,
  Send,
  Play,
  Loader2,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Wand2,
  Pencil,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types";

type StepType =
  | "web_scrape"
  | "document_extract"
  | "ai_transform"
  | "webhook"
  | "email";

interface StepConfigData {
  url?: string;
  schemaId?: string;
  sessionId?: string;
  enableHandoff?: boolean;
  webhookUrl?: string;
  email?: string;
  // AI Transform
  transformPrompt?: string;
}

interface WorkflowStep {
  id: string;
  type: StepType;
  config: StepConfigData;
}

interface Schema {
  id: string;
  name: string;
}

interface VaultSession {
  id: string;
  name: string;
}

interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  workflow_definition: WorkflowStep[];
  schedule_type: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  run_count: number;
  created_at: string;
}

interface WorkflowsTabProps {
  tenantId: string;
  schemas: Schema[];
  vaultSessions: VaultSession[];
}

const stepTypeInfo: Record<
  StepType,
  { label: string; icon: LucideIcon; color: string }
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
  ai_transform: {
    label: "AI Transform",
    icon: Wand2,
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

function StepConfig({
  step,
  index,
  schemas,
  vaultSessions,
  onUpdate,
  onDelete,
  onTest,
  isLast,
  testResult,
  isTesting,
  previousStepResult,
  isTestMode = true,
}: {
  step: WorkflowStep;
  index: number;
  schemas: Schema[];
  vaultSessions: VaultSession[];
  onUpdate: (config: StepConfigData) => void;
  onDelete: () => void;
  onTest: () => void;
  isLast: boolean;
  testResult?: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
  isTesting: boolean;
  previousStepResult?: Record<string, unknown> | null;
  isTestMode?: boolean;
}) {
  const info = stepTypeInfo[step.type];
  const Icon = info.icon;
  const needsPreviousData =
    step.type === "ai_transform" ||
    step.type === "webhook" ||
    step.type === "email";
  const hasPreviousData =
    previousStepResult && Object.keys(previousStepResult).length > 0;

  return (
    <div className="relative">
      <div className="border border-border/50 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] font-bold">
              {index + 1}
            </Badge>
            <div className={`p-2 ${info.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              {info.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={isTesting || (needsPreviousData && !hasPreviousData)}
              className="h-7 px-2 text-[10px] uppercase tracking-widest font-bold"
              title={
                needsPreviousData && !hasPreviousData
                  ? "Run previous steps first to get input data"
                  : "Test this step"
              }
            >
              {isTesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Test
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Previous step data indicator */}
        {needsPreviousData && (
          <div
            className={`text-[10px] px-2 py-1 rounded ${hasPreviousData ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}
          >
            {hasPreviousData ? (
              <span>
                ✓ Has input data from previous step (
                {Object.keys(previousStepResult || {}).length} fields)
              </span>
            ) : (
              <span>⚠ Run previous steps first to provide input data</span>
            )}
          </div>
        )}

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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Schema
                </Label>
                <Select
                  value={step.config.schemaId || ""}
                  onValueChange={(v) =>
                    onUpdate({ ...step.config, schemaId: v })
                  }
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
                  Vault Session
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
                Auto-extract PDFs (Agentic Handoff)
              </Label>
            </div>
          </div>
        )}

        {step.type === "webhook" && (
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
        )}

        {step.type === "email" && (
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
        )}

        {step.type === "ai_transform" && (
          <div className="grid gap-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Transform Instructions
            </Label>
            <Textarea
              value={step.config.transformPrompt || ""}
              onChange={(e) =>
                onUpdate({ ...step.config, transformPrompt: e.target.value })
              }
              placeholder="Restructure this data as a summary with bullet points...\n\nOr: Extract only the price and product name fields...\n\nOr: Convert to a markdown table format..."
              rows={4}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1 text-purple-500" />
              Uses AI to transform accumulated data from previous steps
            </p>
          </div>
        )}

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`mt-3 p-3 text-xs font-mono rounded border ${testResult.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-[10px] uppercase tracking-widest font-bold ${testResult.success ? "text-green-600" : "text-red-600"}`}
              >
                {testResult.success ? "Test Passed" : "Test Failed"}
              </span>
              {testResult.success && testResult.data && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {Object.keys(testResult.data).length} fields
                </span>
              )}
            </div>
            {testResult.error && (
              <p className="text-red-600 text-[10px]">{testResult.error}</p>
            )}
            {testResult.data && isTestMode && (
              <pre className="text-[10px] overflow-auto max-h-48 p-2 bg-background/50 rounded">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
            {testResult.data && !isTestMode && (
              <p className="text-[10px] text-muted-foreground italic">
                🔒 Data extracted successfully but hidden in production mode
              </p>
            )}
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex justify-center py-2">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function WorkflowsTab({
  tenantId,
  schemas,
  vaultSessions,
}: WorkflowsTabProps) {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  // New workflow form
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  // Step testing state
  const [testingStep, setTestingStep] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<
    Record<
      string,
      { success: boolean; data?: Record<string, unknown>; error?: string }
    >
  >({});

  const fetchWorkflows = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("scheduled_workflows")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    // Map the DB result to SavedWorkflow
    const mapped: SavedWorkflow[] = (data || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      workflow_definition: d.workflow_definition as unknown as WorkflowStep[],
      schedule_type: d.schedule_type,
      is_active: d.is_active,
      last_run_at: d.last_run_at,
      last_run_status: d.last_run_status,
      run_count: d.run_count,
      created_at: d.created_at,
    }));
    setWorkflows(mapped);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

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

  const updateStep = (id: string, config: StepConfigData) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, config } : s)));
  };

  const deleteStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
    // Clear test result for deleted step
    setStepResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Get accumulated data up to a specific step index
  const getAccumulatedData = (
    upToIndex: number,
  ): Record<string, unknown> | null => {
    let accumulated: Record<string, unknown> | null = null;
    for (let i = 0; i < upToIndex; i++) {
      const stepId = steps[i]?.id;
      if (stepId && stepResults[stepId]?.success && stepResults[stepId]?.data) {
        accumulated = { ...(accumulated || {}), ...stepResults[stepId].data };
      }
    }
    return accumulated;
  };

  // Test a single step
  const testStep = async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return;

    setTestingStep(step.id);
    const previousData = getAccumulatedData(stepIndex);

    try {
      if (step.type === "web_scrape") {
        if (!step.config.url || !step.config.schemaId) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: false, error: "URL and Schema are required" },
          }));
          setTestingStep(null);
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
            testMode: true, // Return actual extracted data for testing
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: false,
              error: data.error || "Web scrape failed",
            },
          }));
        } else {
          // Use extractedData if available (test mode), otherwise store the response metadata
          const resultData = data.extractedData || {
            fieldNames: data.fieldNames,
            extractionId: data.extractionId,
          };
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: true, data: resultData },
          }));
          toast.success("Web scrape test passed!");
          if (data.handoff?.successful > 0) {
            toast.success(`🪄 Extracted ${data.handoff.successful} PDF(s)`);
          }
        }
      }

      if (step.type === "ai_transform") {
        if (!step.config.transformPrompt) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: false,
              error: "Transform prompt is required",
            },
          }));
          setTestingStep(null);
          return;
        }

        if (!previousData) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: false,
              error: "No input data from previous steps",
            },
          }));
          setTestingStep(null);
          return;
        }

        const response = await fetch("/api/ai/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: previousData,
            prompt: step.config.transformPrompt,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          data?: Record<string, unknown>;
        };
        if (!response.ok) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: false,
              error: data.error || "AI Transform failed",
            },
          }));
        } else {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: true,
              data: {
                ...previousData,
                ...(data.data || {}),
                _transformed: true,
              },
            },
          }));
          toast.success("AI Transform test passed!");
        }
      }

      if (step.type === "webhook") {
        if (!step.config.webhookUrl) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: false, error: "Webhook URL is required" },
          }));
          setTestingStep(null);
          return;
        }

        const dataToSend = previousData || {
          test: true,
          message: "Webhook test from Crow",
        };

        try {
          await fetch(step.config.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend),
            mode: "no-cors",
          });
          // no-cors means we can't read the response, but it was sent
          setStepResults((prev) => ({
            ...prev,
            [step.id]: {
              success: true,
              data: { sent: true, payload: dataToSend },
            },
          }));
          toast.success("Webhook sent (check your endpoint)");
        } catch {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: false, error: "Failed to send webhook" },
          }));
        }
      }

      if (step.type === "email") {
        if (!step.config.email) {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: false, error: "Email address is required" },
          }));
          setTestingStep(null);
          return;
        }

        const dataToSend = previousData || {
          message: "No data from previous steps",
        };

        // Send actual test email with [TEST] prefix
        try {
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: step.config.email,
              subject: "Crow Workflow Extraction Results",
              data: dataToSend,
              isTest: true,
            }),
          });

          const result = (await response.json()) as {
            success?: boolean;
            error?: string;
            messageId?: string;
          };

          if (!response.ok) {
            setStepResults((prev) => ({
              ...prev,
              [step.id]: {
                success: false,
                error: result.error || "Failed to send email",
              },
            }));
          } else {
            setStepResults((prev) => ({
              ...prev,
              [step.id]: {
                success: true,
                data: {
                  sent: true,
                  to: step.config.email,
                  subject: "[TEST] Crow Workflow Extraction Results",
                  messageId: result.messageId,
                  payload: dataToSend,
                },
              },
            }));
            toast.success(`Test email sent to ${step.config.email}`);
          }
        } catch {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { success: false, error: "Failed to send email" },
          }));
        }
      }
    } catch (err) {
      setStepResults((prev) => ({
        ...prev,
        [step.id]: {
          success: false,
          error: err instanceof Error ? err.message : "Test failed",
        },
      }));
    } finally {
      setTestingStep(null);
    }
  };

  const saveWorkflow = async () => {
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingWorkflowId) {
      // Update existing workflow
      const { error } = await supabase
        .from("scheduled_workflows")
        .update({
          name: name.trim(),
          workflow_definition: steps as unknown as Json,
        })
        .eq("id", editingWorkflowId);

      setSaving(false);

      if (error) {
        toast.error("Failed to update workflow");
        return;
      }

      toast.success("Workflow updated!");
    } else {
      // Create new workflow
      const { error } = await supabase.from("scheduled_workflows").insert({
        tenant_id: tenantId,
        name: name.trim(),
        workflow_definition: steps as unknown as Json,
        schedule_type: "manual",
      });

      setSaving(false);

      if (error) {
        toast.error("Failed to save workflow");
        return;
      }

      toast.success("Workflow saved!");
    }

    setName("");
    setSteps([]);
    setStepResults({});
    setIsCreating(false);
    setEditingWorkflowId(null);
    fetchWorkflows();
  };

  const editWorkflow = (workflow: SavedWorkflow) => {
    setEditingWorkflowId(workflow.id);
    setName(workflow.name);
    setSteps(workflow.workflow_definition);
    setStepResults({});
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingWorkflowId(null);
    setName("");
    setSteps([]);
    setStepResults({});
  };

  const runWorkflow = async (workflow: SavedWorkflow) => {
    setRunning(workflow.id);
    let lastResult: Record<string, unknown> | null = null;

    try {
      const steps = workflow.workflow_definition;

      for (const step of steps) {
        if (step.type === "web_scrape") {
          if (!step.config.url || !step.config.schemaId) {
            toast.error("Web scrape step missing URL or schema");
            setRunning(null);
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

            // Update workflow status
            const supabase = createClient();
            await supabase
              .from("scheduled_workflows")
              .update({
                last_run_at: new Date().toISOString(),
                last_run_status: "failed",
                last_run_error: data.error,
              })
              .eq("id", workflow.id);

            setRunning(null);
            fetchWorkflows();
            return;
          }

          lastResult = data;
          toast.success("Web scrape completed");

          if (data.handoff?.successful > 0) {
            toast.success(
              `🪄 Agentic handoff: Extracted ${data.handoff.successful} PDF(s)`,
            );
          }
        }

        if (step.type === "webhook" && lastResult) {
          if (!step.config.webhookUrl) {
            toast.error("Webhook step missing URL");
            continue;
          }

          try {
            await fetch(step.config.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lastResult),
              mode: "no-cors",
            });
            toast.success("Webhook delivered");
          } catch {
            toast.error("Webhook delivery failed");
          }
        }

        if (step.type === "email" && lastResult) {
          if (!step.config.email) {
            toast.error("Email step missing address");
            continue;
          }

          try {
            const response = await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: step.config.email,
                subject: `Crow Workflow: ${workflow.name}`,
                data: lastResult,
                isTest: false,
              }),
            });

            if (response.ok) {
              toast.success(`Email sent to ${step.config.email}`);
            } else {
              toast.error("Email delivery failed");
            }
          } catch {
            toast.error("Email delivery failed");
          }
        }

        if (step.type === "ai_transform" && lastResult) {
          if (!step.config.transformPrompt) {
            toast.error("AI Transform step missing prompt");
            continue;
          }

          const transformResponse = await fetch("/api/ai/transform", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: lastResult,
              prompt: step.config.transformPrompt,
            }),
          });

          const transformData = (await transformResponse.json()) as {
            error?: string;
            data?: Record<string, unknown>;
          };
          if (!transformResponse.ok) {
            toast.error(transformData.error || "AI Transform failed");

            const supabase = createClient();
            await supabase
              .from("scheduled_workflows")
              .update({
                last_run_at: new Date().toISOString(),
                last_run_status: "failed",
                last_run_error: transformData.error,
              })
              .eq("id", workflow.id);

            setRunning(null);
            fetchWorkflows();
            return;
          }

          // Merge transformed data into lastResult
          lastResult = {
            ...lastResult,
            ...(transformData.data || {}),
            _transformed: true,
          };
          toast.success("AI Transform completed");
        }
      }

      // Update workflow status
      const supabase = createClient();
      await supabase
        .from("scheduled_workflows")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: "success",
          last_run_error: null,
          run_count: (workflow.run_count || 0) + 1,
        })
        .eq("id", workflow.id);

      toast.success("Workflow completed!");
      fetchWorkflows();
    } catch (err) {
      toast.error("Workflow failed");

      const supabase = createClient();
      await supabase
        .from("scheduled_workflows")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: "failed",
          last_run_error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", workflow.id);

      fetchWorkflows();
    } finally {
      setRunning(null);
    }
  };

  const deleteWorkflow = async (id: string) => {
    const supabase = createClient();
    await supabase.from("scheduled_workflows").delete().eq("id", id);
    toast.success("Workflow deleted");
    fetchWorkflows();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Workflows
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Automated extraction pipelines with agentic handoff
          </p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3 mr-2" />
            New Workflow
          </Button>
        )}
      </div>

      {/* New Workflow Builder */}
      {isCreating && (
        <Card className="border-border/50 rounded-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              {editingWorkflowId ? "Edit Workflow" : "New Workflow"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Steps ({steps.length})
              </Label>

              {steps.length === 0 ? (
                <div className="border border-dashed border-border/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Add steps to build your pipeline
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {steps.map((step, index) => (
                    <StepConfig
                      key={step.id}
                      step={step}
                      index={index}
                      schemas={schemas}
                      vaultSessions={vaultSessions}
                      onUpdate={(config) => updateStep(step.id, config)}
                      onDelete={() => deleteStep(step.id)}
                      onTest={() => testStep(index)}
                      isLast={index === steps.length - 1}
                      testResult={stepResults[step.id]}
                      isTesting={testingStep === step.id}
                      previousStepResult={getAccumulatedData(index)}
                    />
                  ))}
                </div>
              )}

              {/* Add Step Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
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
                  onClick={() => addStep("ai_transform")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Wand2 className="w-3 h-3 mr-2 text-purple-600" />
                  AI Transform
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStep("email")}
                  className="text-[10px] uppercase tracking-widest"
                >
                  <Send className="w-3 h-3 mr-2 text-orange-600" />
                  Email
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {Object.keys(stepResults).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStepResults({})}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    Clear Test Results
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                  className="text-[10px] uppercase tracking-widest font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveWorkflow}
                  disabled={saving || !name.trim() || steps.length === 0}
                  className="text-[10px] uppercase tracking-widest font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      {editingWorkflowId ? "Updating..." : "Saving..."}
                    </>
                  ) : editingWorkflowId ? (
                    "Update Workflow"
                  ) : (
                    "Save Workflow"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Workflows */}
      {workflows.length === 0 && !isCreating ? (
        <Card className="border-border/50 rounded-none shadow-none">
          <CardContent className="py-12 text-center">
            <Play className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No workflows yet. Create one to automate extractions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="border-border/50 rounded-none shadow-none"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {workflow.last_run_status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : workflow.last_run_status === "failed" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-bold">{workflow.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(workflow.workflow_definition as WorkflowStep[]).map(
                        (step, i) => {
                          const info = stepTypeInfo[step.type];
                          const Icon = info.icon;
                          return (
                            <div
                              key={step.id}
                              className="flex items-center gap-1"
                            >
                              {i > 0 && (
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              )}
                              <div className={`p-1 ${info.color}`}>
                                <Icon className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[10px] text-muted-foreground">
                      {workflow.run_count > 0 && (
                        <p>{workflow.run_count} runs</p>
                      )}
                      {workflow.last_run_at && (
                        <p>
                          Last:{" "}
                          {new Date(workflow.last_run_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runWorkflow(workflow)}
                      disabled={running === workflow.id}
                      className="text-[10px] uppercase tracking-widest font-bold"
                    >
                      {running === workflow.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-2" />
                          Run
                        </>
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => editWorkflow(workflow)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
