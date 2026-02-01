import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  Database,
  Activity,
  TrendingUp,
} from "lucide-react";

export default async function MonitoringPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch all stats in parallel
  const [
    orgsResult,
    tenantsResult,
    sessionsResult,
    extractionsResult,
    docExtractionsResult,
    schemasResult,
    workflowsResult,
    apiLogsResult,
    apiLogsTodayResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id, name, created_at"),
    supabase.from("tenants").select("id, name, organization_id, created_at"),
    supabase.from("vault_sessions").select("id, name, expires_at, tenant_id"),
    supabase.from("extractions").select("id, created_at"),
    supabase
      .from("document_extractions")
      .select("id, source_type, extracted_at"),
    supabase.from("extraction_schemas").select("id"),
    supabase.from("workflows").select("id, name"),
    supabase
      .from("api_usage_logs")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("api_usage_logs")
      .select("id")
      .gte(
        "created_at",
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      ),
  ]);

  const orgs = orgsResult.data || [];
  const tenants = tenantsResult.data || [];
  const sessions = sessionsResult.data || [];
  const extractions = extractionsResult.data || [];
  const docExtractions = docExtractionsResult.data || [];
  const schemas = schemasResult.data || [];
  const workflows = workflowsResult.data || [];
  const apiLogs = apiLogsResult.data || [];
  const apiLogsToday = apiLogsTodayResult.data || [];

  // Calculate session health
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let healthySessions = 0;
  let expiringSessions = 0;
  let expiredSessions = 0;

  sessions.forEach((s) => {
    if (!s.expires_at) {
      healthySessions++;
      return;
    }
    const expiryDate = new Date(s.expires_at);
    if (expiryDate < now) {
      expiredSessions++;
    } else if (expiryDate < threeDaysFromNow) {
      expiringSessions++;
    } else {
      healthySessions++;
    }
  });

  // Calculate extraction stats
  const webExtractions = docExtractions.filter(
    (e) => e.source_type === "web",
  ).length;
  const docExtractionsCount = docExtractions.filter(
    (e) => e.source_type !== "web",
  ).length;
  const totalExtractions = extractions.length + docExtractions.length;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="shrink-0 border-b border-border/50">
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Crow</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Monitoring</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <NotificationsPopover />
          </div>
          <div className="px-4 pb-6">
            <h1 className="text-xl font-bold tracking-tight uppercase">
              System Monitoring
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Real-time overview of your infrastructure
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Building2}
              label="Clusters"
              value={orgs.length}
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={Users}
              label="Clients"
              value={tenants.length}
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
            <StatCard
              icon={Key}
              label="Sessions"
              value={sessions.length}
              color="text-cyan-500"
              bgColor="bg-cyan-500/10"
            />
            <StatCard
              icon={Zap}
              label="API Calls Today"
              value={apiLogsToday.length}
              color="text-amber-500"
              bgColor="bg-amber-500/10"
            />
          </div>

          {/* Session Health */}
          <div className="border border-border/50 bg-card">
            <div className="p-4 border-b border-border/50">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="size-4" />
                Session Health
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="size-8 text-green-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-500">
                    {healthySessions}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    Healthy
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20">
                  <Clock className="size-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-yellow-500">
                    {expiringSessions}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    Expiring Soon
                  </div>
                </div>
                <div className="text-center p-4 bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-red-500">
                    {expiredSessions}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    Expired
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Extraction Stats */}
            <div className="border border-border/50 bg-card">
              <div className="p-4 border-b border-border/50">
                <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Database className="size-4" />
                  Extractions
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-cyan-500" />
                    <span className="text-sm">Web Extractions</span>
                  </div>
                  <span className="font-bold tabular-nums">
                    {extractions.length + webExtractions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-orange-500" />
                    <span className="text-sm">Document Extractions</span>
                  </div>
                  <span className="font-bold tabular-nums">
                    {docExtractionsCount}
                  </span>
                </div>
                <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">{totalExtractions}</span>
                </div>
              </div>
            </div>

            {/* Workflows & Schemas */}
            <div className="border border-border/50 bg-card">
              <div className="p-4 border-b border-border/50">
                <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Automation
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Workflows</span>
                  <span className="font-bold tabular-nums">
                    {workflows.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Extraction Schemas</span>
                  <span className="font-bold tabular-nums">
                    {schemas.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Clusters Overview */}
          <div className="border border-border/50 bg-card">
            <div className="p-4 border-b border-border/50">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Building2 className="size-4" />
                Clusters Overview
              </h2>
            </div>
            <div className="divide-y divide-border/50">
              {orgs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No clusters yet. Create your first cluster to get started.
                </div>
              ) : (
                orgs.map((org) => {
                  const orgTenants = tenants.filter(
                    (t) => t.organization_id === org.id,
                  );
                  const orgSessions = sessions.filter((s) =>
                    orgTenants.some((t) => t.id === s.tenant_id),
                  );
                  return (
                    <div
                      key={org.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Created{" "}
                          {new Date(org.created_at || "").toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold">{orgTenants.length}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            Clients
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{orgSessions.length}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            Sessions
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="border border-border/50 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bgColor}`}>
          <Icon className={`size-5 ${color}`} />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
