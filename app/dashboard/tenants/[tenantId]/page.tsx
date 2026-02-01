import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import { AddVaultSessionDialog } from "@/components/dashboard/add-vault-session-dialog";
import { VaultSessionList } from "@/components/dashboard/vault-session-list";
import { CreateExtractionSchemaDialog } from "@/components/dashboard/create-extraction-schema-dialog";
import { ExtractionSchemaList } from "@/components/dashboard/extraction-schema-list";
import { TenantTabs } from "@/components/dashboard/tenant-tabs";
import { ApiKeyManager } from "@/components/dashboard/api-key-manager";
import { UsageAnalytics } from "@/components/dashboard/usage-analytics";
import { WorkflowsTab } from "@/components/dashboard/workflows-tab";
import { WorkflowRunsHistory } from "@/components/dashboard/workflow-runs-history";
import { deleteTenantInvite } from "@/app/actions";
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
import { Tables } from "@/types";

type TenantWithOrg = Tables<"tenants"> & {
  organizations?: { id: string; name: string } | null;
  api_key_prefix?: string | null;
  api_key_created_at?: string | null;
};

type TenantInvite = Tables<"tenant_invites">;

type TenantMember = Tables<"tenant_members_with_profiles">;

type VaultSession = {
  id: string;
  name: string;
  description: string | null;
  expires_at: string | null;
  expiry_warning_sent: boolean | null;
  is_active: boolean | null;
  last_used_at: string | null;
  use_count: number | null;
  rate_limit_per_hour: number | null;
  rate_limit_per_day: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type VaultErrorLog = {
  id: string;
  vault_session_id: string;
  error_type: string;
  error_message: string | null;
  status_code: number | null;
  request_url: string | null;
  created_at: string | null;
};

type ExtractionField = {
  name: string;
  type: string;
  description?: string;
};

type DocumentExtraction = {
  id: string;
  source_filename: string;
  status: string;
  field_names: string[];
  extracted_at: string | null;
  created_at: string;
};

type ExtractionSchema = {
  id: string;
  name: string;
  description: string | null;
  fields: ExtractionField[];
  is_active: boolean;
  created_at: string;
  document_extractions?: DocumentExtraction[];
};

export default async function TenantManagePage({
  params,
}: {
  params: { tenantId: string };
}) {
  const { tenantId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*, organizations(id, name)")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/50">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Crow</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard?view=joined">
                      My Clients
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Client</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="px-4">
              <NotificationsPopover />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="border border-border/50 bg-card p-8 text-center">
              <h1 className="text-sm font-bold uppercase tracking-widest">
                Client Unavailable
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">
                This client was not found or you don't have access.
              </p>
              <Link
                href="/dashboard?view=joined"
                className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors mt-4 inline-block"
              >
                Back to My Clients
              </Link>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const { data: invites } = await supabase
    .from("tenant_invites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const { data: members } = await supabase
    .from("tenant_members_with_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Fetch vault sessions for this tenant
  const { data: vaultSessions } = await supabase
    .from("vault_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Fetch recent error logs for vault sessions
  const sessionIds = (vaultSessions || []).map((s) => s.id);
  const { data: errorLogs } =
    sessionIds.length > 0
      ? await supabase
          .from("vault_error_logs")
          .select("*")
          .in("vault_session_id", sessionIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] };

  // Fetch extraction schemas with their extractions
  const { data: extractionSchemas } = await supabase
    .from("extraction_schemas")
    .select(
      "*, document_extractions(id, source_filename, status, field_names, extracted_at, created_at)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const tenantInvites = (invites || []) as TenantInvite[];
  const tenantMembers = (members || []) as TenantMember[];
  const tenantVaultSessions = (vaultSessions || []) as VaultSession[];
  const tenantErrorLogs = (errorLogs || []) as VaultErrorLog[];
  const tenantExtractionSchemas = (extractionSchemas ||
    []) as unknown as ExtractionSchema[];
  const tenantWithOrg = tenant as TenantWithOrg;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="shrink-0 border-b border-border/50">
          <div className="flex h-16 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
                    <BreadcrumbLink href="/dashboard?view=joined">
                      My Clients
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{tenantWithOrg.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <NotificationsPopover />
          </div>
          <div className="flex items-center justify-between px-4 pb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                {tenantWithOrg.name}
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Cluster: {tenantWithOrg.organizations?.name || "Unknown"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 pt-4 min-w-0">
          <TenantTabs
            analyticsContent={
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Usage Analytics
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Track extractions, API calls, and activity
                  </p>
                </div>
                <UsageAnalytics tenantId={tenantWithOrg.id} />
              </div>
            }
            workflowsContent={
              <WorkflowsTab
                tenantId={tenantWithOrg.id}
                schemas={tenantExtractionSchemas.map((s) => ({
                  id: s.id,
                  name: s.name,
                }))}
                vaultSessions={tenantVaultSessions.map((s) => ({
                  id: s.id,
                  name: s.name,
                }))}
              />
            }
            runsHistoryContent={
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Workflow Run History
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    View past workflow executions and their results
                  </p>
                </div>
                <WorkflowRunsHistory tenantId={tenantWithOrg.id} />
              </div>
            }
            membersContent={
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest">
                      Team Members
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Manage invites and active members
                    </p>
                  </div>
                  <InviteMemberDialog
                    tenantId={tenantWithOrg.id}
                    tenantName={tenantWithOrg.name}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="border border-border/50 bg-card">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Pending Invites
                      </h3>
                      <Link
                        href="/dashboard?view=tenants"
                        className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Manage all
                      </Link>
                    </div>
                    {tenantInvites.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No pending invites.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {tenantInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                          >
                            <div>
                              <div className="font-medium">{invite.email}</div>
                              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                Role: {invite.role || "member"}
                              </div>
                            </div>
                            <form action={deleteTenantInvite}>
                              <input
                                type="hidden"
                                name="inviteId"
                                value={invite.id}
                              />
                              <button
                                type="submit"
                                className="text-[10px] text-red-500 uppercase font-bold hover:underline"
                              >
                                Retract
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="border border-border/50 bg-card">
                    <div className="px-4 py-3 border-b border-border/50">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Active Members
                      </h3>
                    </div>
                    {tenantMembers.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No active members found.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {tenantMembers.map((member) => (
                          <div
                            key={`${member.tenant_id}-${member.user_id}`}
                            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                          >
                            <div>
                              <div className="font-bold">
                                {member.full_name || "Unknown"}
                              </div>
                              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {member.email || "No Email"}
                              </div>
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {member.role || "member"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            }
            sessionVaultContent={
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest">
                      Session Vault
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Encrypted session cookies for authenticated scraping
                    </p>
                  </div>
                  <AddVaultSessionDialog
                    tenantId={tenantWithOrg.id}
                    tenantName={tenantWithOrg.name}
                  />
                </div>

                <section className="border border-border/50 bg-card">
                  <VaultSessionList
                    sessions={tenantVaultSessions}
                    errorLogs={tenantErrorLogs}
                  />
                </section>
              </div>
            }
            documentVaultContent={
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest">
                      Document Vault
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Encrypted document extractions — values hidden, agents can
                      access
                    </p>
                  </div>
                  <CreateExtractionSchemaDialog
                    tenantId={tenantWithOrg.id}
                    tenantName={tenantWithOrg.name}
                  />
                </div>

                <section className="border border-border/50 bg-card p-4">
                  <ExtractionSchemaList
                    schemas={tenantExtractionSchemas}
                    vaultSessions={tenantVaultSessions}
                  />
                </section>
              </div>
            }
            apiContent={
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Agent API
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    End-to-end encrypted API for AI agents to access extracted
                    data
                  </p>
                </div>

                <ApiKeyManager
                  tenantId={tenantWithOrg.id}
                  tenantName={tenantWithOrg.name}
                  apiKeyPrefix={tenantWithOrg.api_key_prefix ?? null}
                  apiKeyCreatedAt={tenantWithOrg.api_key_created_at ?? null}
                />

                <div className="border border-border/50 bg-card p-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    How It Works
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-widest">
                        1. Generate Key
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Generate an API key for this client. The key is used for
                        both authentication AND decryption.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-widest">
                        2. Store Data
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Extract data from documents or web pages. Values are
                        encrypted with your key before storage.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-widest">
                        3. Agent Access
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Your AI agent calls the API with the key. Data is
                        decrypted on-demand — we never see plaintext.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-border/50 bg-muted/30 p-4 font-mono text-xs space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans font-bold">
                    Example Request
                  </div>
                  <pre className="text-[10px] overflow-x-auto">
                    {`curl -X GET "http://127.0.0.1:3000/api/agent/extract?latest=true" \\
  -H "Authorization: Bearer crow_your_api_key"`}
                  </pre>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans font-bold mt-4">
                    Example Response
                  </div>
                  <pre className="text-[10px] overflow-x-auto">
                    {`{
  "success": true,
  "extraction": {
    "id": "uuid",
    "source": "invoice.pdf",
    "extractedAt": "2024-01-15T10:30:00Z"
  },
  "data": {
    "invoice_total": "$1,234.56",
    "vendor_name": "Acme Corp"
  }
}`}
                  </pre>
                </div>
              </div>
            }
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
