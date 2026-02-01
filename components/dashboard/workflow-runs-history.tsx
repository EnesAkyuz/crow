"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  results: unknown;
  workflow_name?: string;
}

export function WorkflowRunsHistory({ tenantId }: { tenantId: string }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("workflow_runs")
      .select(
        `
        *,
        scheduled_workflows(name)
      `,
      )
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching workflow runs:", error);
    } else {
      setRuns(
        (data || []).map((r) => ({
          ...r,
          workflow_name:
            (r as unknown as { scheduled_workflows?: { name?: string } })
              .scheduled_workflows?.name || "Unknown Workflow",
        })),
      );
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchRuns();

    // Set up realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel("workflow-runs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_runs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchRuns();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchRuns]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
      running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] uppercase",
          colors[status] || colors.pending,
        )}
      >
        {status}
      </Badge>
    );
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Running...";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Workflow Run History
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRuns}
          className="text-[10px] uppercase tracking-widest"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="border border-border/50 p-8 text-center">
          <Play className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No workflow runs yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Run a workflow to see execution history here
          </p>
        </div>
      ) : (
        <div className="border border-border/50 divide-y divide-border/50">
          {runs.map((run) => (
            <div key={run.id} className="bg-card">
              <button
                type="button"
                className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors text-left"
                onClick={() =>
                  setExpandedRun(expandedRun === run.id ? null : run.id)
                }
              >
                <div className="flex items-center gap-4">
                  {expandedRun === run.id ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="font-medium text-sm">
                      {run.workflow_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {formatTime(run.started_at)} • {run.triggered_by}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatDuration(run.started_at, run.completed_at)}
                  </span>
                  {getStatusBadge(run.status)}
                </div>
              </button>

              {expandedRun === run.id && (
                <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/30">
                  <div className="grid gap-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          Started
                        </div>
                        <div className="font-mono text-xs">
                          {new Date(run.started_at).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          Completed
                        </div>
                        <div className="font-mono text-xs">
                          {run.completed_at
                            ? new Date(run.completed_at).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {run.error_message && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-red-500 mb-1">
                          Error
                        </div>
                        <div className="font-mono text-xs bg-red-500/10 p-2 text-red-500 break-all">
                          {run.error_message}
                        </div>
                      </div>
                    )}

                    {run.results && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          Results
                        </div>
                        <pre className="font-mono text-[10px] bg-muted p-2 overflow-auto max-h-48">
                          {JSON.stringify(run.results, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
