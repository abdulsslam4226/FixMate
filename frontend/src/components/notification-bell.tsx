"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import type { Notification } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// Bell icon with unread count badge + click-to-open dropdown.
// Polls the API every 30 s so new notifications appear without a page reload.
export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.apiToken) return;
    try {
      const data = await getNotifications(session.apiToken);
      setNotifications(data);
    } catch {
      // Silent fail — don't interrupt the user if notifications are unavailable
    }
  }, [session?.apiToken]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkRead(id: string) {
    if (!session?.apiToken) return;
    try {
      const updated = await markNotificationRead(id, session.apiToken);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {}
  }

  async function handleMarkAllRead() {
    if (!session?.apiToken) return;
    try {
      await markAllNotificationsRead(session.apiToken);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  if (!session) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="text-muted-foreground hover:text-foreground relative flex h-8 w-8 items-center justify-center rounded-md transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="gradient-violet absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="bg-card border-border absolute right-0 top-10 z-50 w-80 rounded-xl border shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  className={`flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5 ${
                    notif.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">
                      {!notif.isRead && (
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-orange-500 align-middle" />
                      )}
                      {notif.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{notif.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
