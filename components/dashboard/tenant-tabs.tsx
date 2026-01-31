"use client";

import { Users, KeyRound, FileJson, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TenantTabsProps {
  membersContent: React.ReactNode;
  sessionVaultContent: React.ReactNode;
  documentVaultContent: React.ReactNode;
  apiContent: React.ReactNode;
}

export function TenantTabs({
  membersContent,
  sessionVaultContent,
  documentVaultContent,
  apiContent,
}: TenantTabsProps) {
  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
        <TabsTrigger
          value="members"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <Users className="w-3 h-3 mr-2" />
          Members
        </TabsTrigger>
        <TabsTrigger
          value="sessions"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <KeyRound className="w-3 h-3 mr-2" />
          Session Vault
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <FileJson className="w-3 h-3 mr-2" />
          Document Vault
        </TabsTrigger>
        <TabsTrigger
          value="api"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <Key className="w-3 h-3 mr-2" />
          Agent API
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="mt-6">
        {membersContent}
      </TabsContent>

      <TabsContent value="sessions" className="mt-6">
        {sessionVaultContent}
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        {documentVaultContent}
      </TabsContent>

      <TabsContent value="api" className="mt-6">
        {apiContent}
      </TabsContent>
    </Tabs>
  );
}
