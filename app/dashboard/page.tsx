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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch organizations the user is a member of, and their tenants
  // Note: RLS ensures we only see what we are allowed to see
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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                Workspaces
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Multi-tenant Data Ingestion Layer
              </p>
            </div>
            <CreateOrgDialog />
          </div>

          <div className="grid gap-8">
            {organizations?.length === 0 ? (
              <div className="text-center py-24 border border-border/50 bg-card">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest">
                      Zero Workspaces Found
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest max-w-xs mx-auto">
                      Initialize your infrastructure by creating a new
                      workspace.
                    </p>
                  </div>
                  <CreateOrgDialog />
                </div>
              </div>
            ) : (
              organizations?.map((org) => (
                // @ts-ignore
                <OrgCard key={org.id} org={org} />
              ))
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
