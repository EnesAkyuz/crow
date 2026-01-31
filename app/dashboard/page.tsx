import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateOrgDialog } from "@/components/dashboard/create-org-dialog";
import { OrgCard } from "@/components/dashboard/org-card";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const supabase = await createClient();
  const { view } = await searchParams; // Next.js 15 requires async searchParams, ensure we handle if it's treated as promise or not. Next 14 is sync. Assuming Next 14/15 compatibility, await if necessary but strict type is usually simple object in page props.
  // Actually, in the project context we are likely on Next 14 or latest which treats it as object mostly, but let's just assign.

  const isJoinedView = view === "joined";

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
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
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
                    {isJoinedView ? "My Clients" : "My Clusters"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                {isJoinedView ? "My Clients" : "My Clusters"}
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {isJoinedView
                  ? "Clients you have access to"
                  : "Manage your infrastructure clusters"}
              </p>
            </div>
            {!isJoinedView && <CreateOrgDialog />}
          </div>

          {/* Section 1: My Clients (Tenant View) - Flattened List */}
          {isJoinedView && (
            <div className="mb-12">
              {(() => {
                // Flatten tenants from all visible organizations
                const allTenants = tenantOrgs.flatMap((org) =>
                  // @ts-ignore
                  (org.tenants || []).map((t) => ({ ...t, orgName: org.name })),
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
                      <div
                        key={tenant.id}
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
                            <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1">
                              <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section 2: My Clusters (Admin View) */}
          {!isJoinedView && (
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
