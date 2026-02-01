"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Key,
  FileText,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface GlobalStats {
  totalClusters: number;
  totalClients: number;
  totalSessions: number;
  healthySessions: number;
  expiringSessions: number;
  expiredSessions: number;
  totalExtractions: number;
  webExtractions: number;
  docExtractions: number;
  totalSchemas: number;
  totalWorkflows: number;
  apiCallsToday: number;
}

export function SidebarStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalStats() {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [
        orgsResult,
        tenantsResult,
        sessionsResult,
        extractionsResult,
        docExtractionsResult,
        schemasResult,
        workflowsResult,
        apiLogsResult,
      ] = await Promise.all([
        supabase.from("organizations").select("id"),
        supabase.from("tenants").select("id"),
        supabase.from("vault_sessions").select("id, expires_at"),
        supabase.from("extractions").select("id"),
        supabase.from("document_extractions").select("id, source_type"),
        supabase.from("extraction_schemas").select("id"),
        supabase.from("workflows").select("id"),
        supabase
          .from("api_usage_logs")
          .select("id")
          .gte(
            "created_at",
            new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          ),
      ]);

      const sessions = sessionsResult.data || [];
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );

      let healthy = 0;
      let expiring = 0;
      let expired = 0;

      sessions.forEach((s) => {
        if (!s.expires_at) {
          healthy++;
          return;
        }
        const expiryDate = new Date(s.expires_at);
        if (expiryDate < now) {
          expired++;
        } else if (expiryDate < threeDaysFromNow) {
          expiring++;
        } else {
          healthy++;
        }
      });

      const docExtractions = docExtractionsResult.data || [];
      const webCount = docExtractions.filter(
        (e) => e.source_type === "web",
      ).length;
      const docCount = docExtractions.filter(
        (e) => e.source_type !== "web",
      ).length;

      setStats({
        totalClusters: orgsResult.data?.length || 0,
        totalClients: tenantsResult.data?.length || 0,
        totalSessions: sessions.length,
        healthySessions: healthy,
        expiringSessions: expiring,
        expiredSessions: expired,
        totalExtractions:
          (extractionsResult.data?.length || 0) + docExtractions.length,
        webExtractions: (extractionsResult.data?.length || 0) + webCount,
        docExtractions: docCount,
        totalSchemas: schemasResult.data?.length || 0,
        totalWorkflows: workflowsResult.data?.length || 0,
        apiCallsToday: apiLogsResult.data?.length || 0,
      });

      setLoading(false);
    }

    fetchGlobalStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchGlobalStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-2 py-2 space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="px-2 py-2 space-y-4">
      {/* Infrastructure Overview */}
      <div>
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          Infrastructure
        </h4>
        <div className="space-y-1">
          <StatRow
            icon={Building2}
            label="Clusters"
            value={stats.totalClusters}
            color="text-blue-500"
          />
          <StatRow
            icon={Users}
            label="Clients"
            value={stats.totalClients}
            color="text-purple-500"
          />
        </div>
      </div>

      {/* Session Health */}
      <div>
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          Session Health
        </h4>
        <div className="space-y-1">
          <StatRow
            icon={CheckCircle2}
            label="Healthy"
            value={stats.healthySessions}
            color="text-green-500"
          />
          <StatRow
            icon={Clock}
            label="Expiring"
            value={stats.expiringSessions}
            color="text-yellow-500"
            highlight={stats.expiringSessions > 0}
          />
          <StatRow
            icon={AlertTriangle}
            label="Expired"
            value={stats.expiredSessions}
            color="text-red-500"
            highlight={stats.expiredSessions > 0}
          />
        </div>
      </div>

      {/* Extraction Stats */}
      <div>
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          Extractions
        </h4>
        <div className="space-y-1">
          <StatRow
            icon={Globe}
            label="Web"
            value={stats.webExtractions}
            color="text-cyan-500"
          />
          <StatRow
            icon={FileText}
            label="Documents"
            value={stats.docExtractions}
            color="text-orange-500"
          />
        </div>
      </div>

      {/* Today's Activity */}
      <div>
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          Today
        </h4>
        <div className="space-y-1">
          <StatRow
            icon={Zap}
            label="API Calls"
            value={stats.apiCallsToday}
            color="text-amber-500"
          />
        </div>
      </div>

      {/* Quick Numbers (collapsed view) */}
      <div className="hidden group-data-[collapsible=icon]:block pt-2 border-t border-border/50">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Key className="size-4 text-muted-foreground" />
            {stats.expiredSessions > 0 && (
              <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full" />
            )}
            {stats.expiringSessions > 0 && stats.expiredSessions === 0 && (
              <span className="absolute -top-1 -right-1 size-2 bg-yellow-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] font-bold">{stats.totalSessions}</span>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  color,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded transition-colors",
        highlight && "bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
        <Icon className={cn("size-3.5", color)} />
        <span className="text-[11px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-bold tabular-nums group-data-[collapsible=icon]:hidden",
          highlight && color,
        )}
      >
        {value}
      </span>
    </div>
  );
}
