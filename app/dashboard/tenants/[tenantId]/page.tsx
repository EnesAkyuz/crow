import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import { AddVaultSessionDialog } from "@/components/dashboard/add-vault-session-dialog";
import { VaultSessionList } from "@/components/dashboard/vault-session-list";
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

  const tenantInvites = (invites || []) as TenantInvite[];
  const tenantMembers = (members || []) as TenantMember[];
  const tenantVaultSessions = (vaultSessions || []) as VaultSession[];
  const tenantErrorLogs = (errorLogs || []) as VaultErrorLog[];
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
            <InviteMemberDialog
              tenantId={tenantWithOrg.id}
              tenantName={tenantWithOrg.name}
            />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border border-border/50 bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Pending Invites
                </h2>
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
                        <button className="text-[10px] text-red-500 uppercase font-bold hover:underline">
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Active Members
                </h2>
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

          {/* Vault Sessions Section */}
          <section className="border border-border/50 bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Session Vault
                </h2>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  Encrypted session cookies for authenticated scraping
                </p>
              </div>
              <AddVaultSessionDialog
                tenantId={tenantWithOrg.id}
                tenantName={tenantWithOrg.name}
              />
            </div>
            <VaultSessionList
              sessions={tenantVaultSessions}
              errorLogs={tenantErrorLogs}
            />
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
