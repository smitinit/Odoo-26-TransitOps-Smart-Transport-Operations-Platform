"use client"

import {
  BellIcon,
  FuelIcon,
  RouteIcon,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
  CircleDollarSignIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useNotifications } from "@/components/notifications/notifications-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AppNotification } from "@/lib/api"
import { cn } from "@/lib/utils"

const CATEGORY_ICON: Record<string, typeof BellIcon> = {
  trip: RouteIcon,
  vehicle: TruckIcon,
  driver: UsersIcon,
  maintenance: WrenchIcon,
  fuel: FuelIcon,
  expense: CircleDollarSignIcon,
  system: BellIcon,
}

const CATEGORY_COLOR: Record<string, string> = {
  trip: "text-violet-600 dark:text-violet-400",
  vehicle: "text-orange-600 dark:text-orange-400",
  driver: "text-blue-600 dark:text-blue-400",
  maintenance: "text-amber-600 dark:text-amber-400",
  fuel: "text-emerald-600 dark:text-emerald-400",
  expense: "text-slate-600 dark:text-slate-300",
  system: "text-muted-foreground",
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ""
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function NotificationRow({
  item,
  onRead,
}: {
  item: AppNotification
  onRead: (id: string) => Promise<void>
}) {
  const Icon = CATEGORY_ICON[item.category] ?? BellIcon
  const color = CATEGORY_COLOR[item.category] ?? CATEGORY_COLOR.system

  return (
    <button
      type="button"
      className={cn(
        "flex w-full gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50 sm:px-6",
        !item.is_read && "bg-primary/5"
      )}
      onClick={() => {
        if (!item.is_read) {
          void onRead(item.id).catch((error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to mark as read"
            )
          })
        }
      }}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={cn("size-4", color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.title}</p>
          {!item.is_read ? <Badge variant="secondary">New</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {relativeTime(item.created_at)}
        </p>
      </div>
    </button>
  )
}

export default function NotificationsPage() {
  const { items, loading, unreadCount, markRead, markAllRead, refresh } =
    useNotifications()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live updates for trips, fleet, maintenance, and expenses.
            {unreadCount > 0 ? ` ${unreadCount} unread.` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh()
            }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => {
              void markAllRead()
                .then(() => toast.success("All marked as read"))
                .catch((error) =>
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to mark all as read"
                  )
                )
            }}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {loading && items.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            Loading notifications...
          </p>
        ) : items.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            No notifications yet. They appear here in real time as ops events
            happen.
          </p>
        ) : (
          items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={markRead} />
          ))
        )}
      </div>
    </div>
  )
}
