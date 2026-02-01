"use client";

import {
  Users,
  KeyRound,
  FileJson,
  Key,
  BarChart3,
  Play,
  History,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TenantTabsProps {
  membersContent: React.ReactNode;
  sessionVaultContent: React.ReactNode;
  documentVaultContent: React.ReactNode;
  apiContent: React.ReactNode;
  analyticsContent: React.ReactNode;
  workflowsContent: React.ReactNode;
  runsHistoryContent?: React.ReactNode;
}

export function TenantTabs({
  membersContent,
  sessionVaultContent,
  documentVaultContent,
  apiContent,
  analyticsContent,
  workflowsContent,
  runsHistoryContent,
}: TenantTabsProps) {
  return (
    <Tabs defaultValue="analytics" className="w-full min-w-0">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto overflow-x-auto flex-wrap">
        <TabsTrigger
          value="analytics"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <BarChart3 className="w-3 h-3 mr-2" />
          Analytics
        </TabsTrigger>
        <TabsTrigger
          value="workflows"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <Play className="w-3 h-3 mr-2" />
          Workflows
        </TabsTrigger>
        <TabsTrigger
          value="runs"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
        >
          <History className="w-3 h-3 mr-2" />
          Run History
        </TabsTrigger>
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

      <TabsContent value="analytics" className="mt-6">
        {analyticsContent}
      </TabsContent>

      <TabsContent value="workflows" className="mt-6">
        {workflowsContent}
      </TabsContent>

      <TabsContent value="runs" className="mt-6">
        {runsHistoryContent}
      </TabsContent>

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
