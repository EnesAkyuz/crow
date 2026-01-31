import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateTenantDialog } from "./create-tenant-dialog";
import { InviteMemberDialog } from "./invite-member-dialog";

interface Tenant {
  id: string;
  name: string;
  created_at: string | null;
}

interface Organization {
  id: string;
  name: string;
  created_at: string | null;
  tenants: Tenant[];
}

export function OrgCard({ org }: { org: Organization }) {
  return (
    <div key={org.id} className="w-full border border-border/50 bg-card">
      <div className="flex flex-row items-center justify-between p-6 border-b border-border/50 bg-muted/5">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight">{org.name}</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {new Date(org.created_at || "").toLocaleDateString()}
          </p>
        </div>
        <CreateTenantDialog orgId={org.id} />
      </div>
      <div className="p-0">
        <div className="">
          {org.tenants.length === 0 ? (
            <div className="p-8 text-center border-b border-border/50 border-dashed">
              <p className="text-xs text-muted-foreground uppercase tracking-tighter">
                No active tenants in this workspace.
              </p>
            </div>
          ) : (
            <div className="">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-widest text-muted-foreground pl-6">
                      Client Name
                    </TableHead>
                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      Joined
                    </TableHead>
                    <TableHead className="h-10 w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="border-b border-border/50">
                  {org.tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      className="hover:bg-muted/5 group border-b border-border/50 last:border-0"
                    >
                      <TableCell className="font-medium text-sm pl-6 py-4">
                        {tenant.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-4">
                        {new Date(tenant.created_at || "").toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-6 py-4">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <InviteMemberDialog
                            tenantId={tenant.id}
                            tenantName={tenant.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
