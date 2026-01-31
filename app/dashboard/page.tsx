import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateOrgDialog } from "@/components/dashboard/create-org-dialog";
import { OrgCard } from "@/components/dashboard/org-card";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
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
import Link from "next/link";

type TenantInvite = Tables<"tenant_invites"> & {
  tenants?: {
    name: string | null;
    organization_id: string | null;
  } | null;
};

type TenantMember = Tables<"tenant_members_with_profiles">;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const supabase = await createClient();
  const { view } = await searchParams; // Next.js 15 requires async searchParams, ensure we handle if it's treated as promise or not. Next 14 is sync. Assuming Next 14/15 compatibility, await if necessary but strict type is usually simple object in page props.
  // Actually, in the project context we are likely on Next 14 or latest which treats it as object mostly, but let's just assign.

  const isJoinedView = view === "joined";
  const isTenantsView = view === "tenants";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch only necessary data based on view to optimize?
  // RLS protects us anyway, so fetching all is fine for now for simplicity, but strictly we could filter in query.
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*, tenants(*)")
    .order("created_at", { ascending: false });

  // If in tenants view, fetch invites and active members
  let tenantInvites: TenantInvite[] = [];
  let tenantMembers: TenantMember[] = [];

  if (isTenantsView) {
    const { data: invites } = await supabase
      .from("tenant_invites")
      .select("*, tenants(name, organization_id)")
      .order("created_at", { ascending: false });
    tenantInvites = (invites || []) as TenantInvite[];

    // Fetch active members using the new view
    const { data: members } = await supabase
      .from("tenant_members_with_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    tenantMembers = (members || []) as TenantMember[];
  }

  if (error) {
    const errorString = JSON.stringify(error);
    console.error("Error fetching dashboard data:", errorString);
    return (
      <div className="p-8 text-red-500">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  // Filter organizations
  const adminOrgs =
    organizations?.filter((org) => org.created_by === user.id) || [];
  const tenantOrgs =
    organizations?.filter((org) => org.created_by !== user.id) || [];

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
                    <BreadcrumbLink href="#">Crow</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {isJoinedView
                        ? "My Clients"
                        : isTenantsView
                          ? "Manage Tenants"
                          : "My Clusters"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <NotificationsPopover />
          </div>
          <div className="flex items-center justify-between px-4 pb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                {isJoinedView
                  ? "My Clients"
                  : isTenantsView
                    ? "Manage Tenants"
                    : "My Clusters"}
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {isJoinedView
                  ? "Clients you have access to"
                  : isTenantsView
                    ? "Manage invites and tenant access"
                    : "Manage your infrastructure clusters"}
              </p>
            </div>
            {!isJoinedView && !isTenantsView && <CreateOrgDialog />}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          {/* VIEW: Manage Tenants */}
          {isTenantsView && (
            <div className="space-y-8">
              {/* Invites Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Pending Invites (No Account Yet)
                </h3>
                {tenantInvites.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-border/50 p-6 bg-card text-center">
                    No pending invites.
                  </div>
                ) : (
                  <div className="border border-border/50 bg-card">
                    <div className="grid grid-cols-4 p-3 border-b border-border/50 bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                      <div className="col-span-1">Email</div>
                      <div className="col-span-1">Target Client</div>
                      <div className="col-span-1">Role</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>
                    {tenantInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="grid grid-cols-4 p-3 border-b border-border/50 last:border-0 items-center text-sm"
                      >
                        <div className="col-span-1 font-medium">
                          {invite.email}
                        </div>
                        <div className="col-span-1 text-muted-foreground">
                          {invite.tenants?.name || "Unknown"}
                        </div>
                        <div className="col-span-1 uppercase text-[10px] tracking-widest">
                          {invite.role}
                        </div>
                        <div className="col-span-1 text-right">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Active Members Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Active Members
                </h3>
                {tenantMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-border/50 p-6 bg-card text-center">
                    No active members found.
                  </div>
                ) : (
                  <div className="border border-border/50 bg-card">
                    <div className="grid grid-cols-4 p-3 border-b border-border/50 bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                      <div className="col-span-1">Member</div>
                      <div className="col-span-1">Client Access</div>
                      <div className="col-span-1">Role</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>
                    {tenantMembers.map((member) => (
                      <div
                        key={`${member.tenant_id}-${member.user_id}`}
                        className="grid grid-cols-4 p-3 border-b border-border/50 last:border-0 items-center text-sm"
                      >
                        <div className="col-span-1 grid gap-1">
                          <span className="font-bold leading-none">
                            {member.full_name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {member.email || "No Email"}
                          </span>
                        </div>
                        <div className="col-span-1 text-muted-foreground font-medium">
                          {member.tenant_name}
                        </div>
                        <div className="col-span-1 uppercase text-[10px] tracking-widest">
                          {member.role}
                        </div>
                        <div className="col-span-1 text-right">
                          {/* Show Kick for everyone except self */}
                          {member.user_id !== user.id && (
                            <button className="text-[10px] text-red-500 uppercase font-bold hover:underline">
                              Kick
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 1: My Clients (Tenant View) - Flattened List */}
          {isJoinedView && (
            <div className="mb-12">
              {(() => {
                // Flatten tenants from all visible organizations (joined + owned)
                const allTenantsRaw = [...tenantOrgs, ...adminOrgs].flatMap(
                  (org) =>
                    // @ts-ignore
                    (org.tenants || []).map((t) => ({
                      ...t,
                      orgName: org.name,
                    })),
                );
                const allTenants = allTenantsRaw.filter(
                  (tenant, index, self) =>
                    self.findIndex((item) => item.id === tenant.id) === index,
                );

                if (allTenants.length === 0) {
                  return (
                    <div className="text-center py-24 border border-border/50 bg-card">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest">
                          No Clients Assigned
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest max-w-xs mx-auto">
                          You haven't been assigned to any clients yet.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {allTenants.map((tenant: any) => (
                      <Link
                        key={tenant.id}
                        href={`/dashboard/tenants/${tenant.id}`}
                        className="group border border-border/50 bg-card hover:bg-muted/5 transition-colors p-6 cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h13M12 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-bold text-lg tracking-tight">
                              {tenant.name}
                            </h3>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                              Cluster: {tenant.orgName}
                            </p>
                          </div>
                          <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Status
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1">
                                <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Manage
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section 2: My Clusters (Admin View) */}
          {!isJoinedView && !isTenantsView && (
            <div>
              <div className="grid gap-8">
                {adminOrgs.length === 0 ? (
                  <div className="text-center py-24 border border-border/50 bg-card">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest">
                          Zero Clusters Found
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest max-w-xs mx-auto">
                          Initialize your infrastructure by creating a new
                          cluster.
                        </p>
                      </div>
                      <CreateOrgDialog />
                    </div>
                  </div>
                ) : (
                  adminOrgs.map((org) => (
                    // @ts-ignore
                    <OrgCard key={org.id} org={org} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
