"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppNotification } from "@/types/domain";

type NotificationsCenterConsoleProps = {
  initialNotifications: AppNotification[];
  currentUserEmail: string;
};

type NotificationsPayload = {
  items: AppNotification[];
  unreadCount: number;
};

export function NotificationsCenterConsole({
  initialNotifications,
  currentUserEmail
}: NotificationsCenterConsoleProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const normalizedEmail = currentUserEmail.trim().toLowerCase();

  const unreadCount = useMemo(
    () => notifications.filter((item) => !(item.readBy ?? []).includes(normalizedEmail)).length,
    [notifications, normalizedEmail]
  );

  useEffect(() => {
    let cancelled = false;

    async function markAllRead() {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" })
      });

      if (!response.ok || cancelled) {
        return;
      }

      const payload = (await response.json()) as NotificationsPayload;
      setNotifications(payload.items);
    }

    async function refreshFeed() {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok || cancelled) {
        return;
      }

      const payload = (await response.json()) as NotificationsPayload;
      setNotifications(payload.items);
    }

    void markAllRead();
    const timer = window.setInterval(() => {
      void refreshFeed();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="surface-panel clean-marine-panel">
      <div className="section-header">
        <div>
          <h2>Admin Notifications</h2>
          <p>The same shared notifications shown in the top-right drawer are listed here for a fuller review view.</p>
        </div>
        <span className="status-chip status-chip-default">
          {notifications.length} items · {unreadCount} unread
        </span>
      </div>

      <div className="dashboard-stack">
        {notifications.length > 0 ? (
          notifications.map((item) => {
            const isUnread = !(item.readBy ?? []).includes(normalizedEmail);

            return (
              <article key={item.id} className={`dashboard-today-card ${isUnread ? "notification-card-unread" : ""}`}>
                <div className="panel-head">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <div className="meta-row">
                    <span className={`status-chip status-chip-${item.importance === "critical" ? "danger" : "default"}`}>
                      {item.importance === "critical" ? "Critical" : "Info"}
                    </span>
                    <span className={`status-chip status-chip-${item.tone ?? "default"}`}>{item.channel}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className="tag">{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                  <span className="tag">Audience: Admins</span>
                  {isUnread ? <span className="tag notification-unread-tag">Unread</span> : null}
                </div>
              </article>
            );
          })
        ) : (
          <article className="dashboard-today-card">
            <strong>No notifications yet.</strong>
          </article>
        )}
      </div>
    </section>
  );
}
