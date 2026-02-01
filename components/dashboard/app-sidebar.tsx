"use client";

import * as React from "react";
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Plus,
  Sparkles,
  User,
  Monitor,
  BookOpen,
} from "lucide-react";
import { CheckExpiringSessionsButton } from "@/components/dashboard/check-expiring-sessions-button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AppSidebar({ user }: { user: any }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-16 border-b border-border/50 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center bg-black text-white dark:bg-white dark:text-black">
                <Sparkles className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight uppercase text-xs">
                  Crow
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <div className="px-2 py-2">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
              Admin
            </h4>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My Clusters" className="h-10">
                <a href="/dashboard">
                  <Monitor className="size-4" />
                  <span className="font-medium">My Clusters</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Manage Tenants"
                className="h-10"
              >
                <a href="/dashboard?view=tenants">
                  <User className="size-4" />
                  <span className="font-medium">Manage Tenants</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
          <div className="px-2 py-2 mt-4">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
              Access
            </h4>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My Clients" className="h-10">
                <a href="/dashboard?view=joined">
                  <User className="size-4" />
                  <span className="font-medium">My Clients</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
          <div className="px-2 py-2 mt-4">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
              Tools
            </h4>
            <SidebarMenuItem>
              <CheckExpiringSessionsButton variant="sidebar" />
            </SidebarMenuItem>
          </div>
          <div className="px-2 py-2 mt-4">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
              Developers
            </h4>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="API Docs" className="h-10">
                <a href="/dashboard/docs">
                  <BookOpen className="size-4" />
                  <span className="font-medium">API Docs</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-12"
                >
                  <Avatar className="h-8 w-8 rounded-none">
                    <AvatarImage
                      src={user?.user_metadata?.avatar_url}
                      alt={user?.email}
                    />
                    <AvatarFallback className="rounded-none">U</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                    <span className="truncate font-semibold">
                      {user?.user_metadata?.full_name || "User"}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground uppercase">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-none border-border/50 shadow-none"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-none">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url}
                        alt={user?.email}
                      />
                      <AvatarFallback className="rounded-none">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-xs">
                        {user?.user_metadata?.full_name || "User"}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground uppercase">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer rounded-none"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
