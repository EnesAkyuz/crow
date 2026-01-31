"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface CheckResult {
  success: boolean;
  message: string;
  processed: number;
  successful?: number;
  failed?: number;
}

interface CheckExpiringSessionsButtonProps {
  variant?: "default" | "sidebar";
}

export function CheckExpiringSessionsButton({
  variant = "default",
}: CheckExpiringSessionsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    try {
      const response = await fetch("/api/check-expiring-sessions", {
        method: "POST",
      });
      const data: CheckResult = await response.json();

      if (data.success) {
        if (data.processed === 0) {
          toast.info("No sessions need notifications right now");
        } else {
          toast.success(
            `Processed ${data.processed} session${data.processed !== 1 ? "s" : ""}: ${data.successful} notified, ${data.failed} failed`,
          );
        }
      } else {
        toast.error("Failed to check sessions");
      }
    } catch (error) {
      toast.error("Network error checking sessions");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "sidebar") {
    return (
      <SidebarMenuButton
        tooltip="Check Expiring Sessions"
        className="h-10"
        onClick={handleCheck}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Bell className="size-4" />
        )}
        <span className="font-medium">
          {loading ? "Checking..." : "Check Expiring"}
        </span>
      </SidebarMenuButton>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheck}
            disabled={loading}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Bell className="w-3 h-3 mr-2" />
            )}
            {loading ? "Checking..." : "Check Expiring"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Send email notifications for sessions expiring soon
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
