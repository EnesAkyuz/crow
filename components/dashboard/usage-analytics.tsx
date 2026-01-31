"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Globe,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface AnalyticsData {
  totalExtractions: number;
  webExtractions: number;
  documentExtractions: number;
  apiCalls: number;
  schemasCount: number;
  sessionsCount: number;
  recentExtractions: {
    id: string;
    source: string;
    sourceType: string;
    extractedAt: string;
  }[];
  extractionsByDay: { date: string; count: number }[];
}

export function UsageAnalytics({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const supabase = createClient();

      // Fetch all analytics data in parallel
      const [extractionsResult, schemasResult, sessionsResult, apiLogsResult] =
        await Promise.all([
          supabase
            .from("document_extractions")
            .select("id, source_filename, source_type, extracted_at")
            .eq("tenant_id", tenantId)
            .order("extracted_at", { ascending: false }),
          supabase
            .from("extraction_schemas")
            .select("id")
            .eq("tenant_id", tenantId),
          supabase
            .from("vault_sessions")
            .select("id")
            .eq("tenant_id", tenantId),
          supabase
            .from("api_usage_logs")
            .select("id, created_at")
            .eq("tenant_id", tenantId),
        ]);

      const extractions = extractionsResult.data || [];
      const webCount = extractions.filter(
        (e) => e.source_type === "web",
      ).length;
      const docCount = extractions.filter(
        (e) => e.source_type !== "web",
      ).length;

      // Group extractions by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const extractionsByDay = last7Days.map((date) => ({
        date,
        count: extractions.filter((e) => e.extracted_at?.split("T")[0] === date)
          .length,
      }));

      setData({
        totalExtractions: extractions.length,
        webExtractions: webCount,
        documentExtractions: docCount,
        apiCalls: apiLogsResult.data?.length || 0,
        schemasCount: schemasResult.data?.length || 0,
        sessionsCount: sessionsResult.data?.length || 0,
        recentExtractions: extractions.slice(0, 5).map((e) => ({
          id: e.id,
          source: e.source_filename || "Unknown",
          sourceType: e.source_type || "unknown",
          extractedAt: e.extracted_at || "",
        })),
        extractionsByDay,
      });

      setLoading(false);
    }

    fetchAnalytics();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50 rounded-none shadow-none">
              <CardContent className="p-4">
                <div className="h-16 bg-muted/50 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.extractionsByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalExtractions}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total Extractions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10">
                <Globe className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.webExtractions}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Web Scrapes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.documentExtractions}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Documents
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10">
                <Zap className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.apiCalls}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  API Calls
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Extractions (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {data.extractionsByDay.map((day, i) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex flex-col items-center justify-end h-24">
                  <span className="text-[10px] font-medium mb-1">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className="w-full bg-primary/80 transition-all"
                    style={{
                      height: `${(day.count / maxCount) * 100}%`,
                      minHeight: day.count > 0 ? "4px" : "0px",
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Extractions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentExtractions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No extractions yet
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentExtractions.map((extraction) => (
                <div
                  key={extraction.id}
                  className="flex items-center justify-between p-2 border border-border/50 bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    {extraction.sourceType === "web" ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-purple-600" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {extraction.source}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(extraction.extractedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
