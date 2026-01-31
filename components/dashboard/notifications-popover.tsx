"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setNotifications(
          data.map((n) => ({
            ...n,
            created_at: n.created_at || new Date().toISOString(),
            is_read: n.is_read || false,
          })) as Notification[],
        );
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative group hover:scale-105 transition-transform"
        >
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 border border-border/50 shadow-xl backdrop-blur-xl bg-background/80"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h4 className="font-semibold text-sm tracking-tight">
            Notifications
          </h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? "bg-muted/20" : ""
                  }`}
                  onClick={() =>
                    !notification.is_read && markAsRead(notification.id)
                  }
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h5
                      className={`text-sm font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {notification.title}
                    </h5>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/50 mt-2 block">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
