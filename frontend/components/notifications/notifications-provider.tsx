"use client"

import * as React from "react"

import { useAuth } from "@/components/auth/auth-provider"
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/lib/api"
import type { AppNotification } from "@/lib/api"
import { userHasPermission } from "@/lib/auth/permissions"

type NotificationsContextValue = {
  items: AppNotification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext =
  React.createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const canRead = userHasPermission(user, "notification.read")
  const [items, setItems] = React.useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const refresh = React.useCallback(async () => {
    if (!canRead) {
      setItems([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const [list, count] = await Promise.all([
        listNotifications({ limit: 50 }),
        getUnreadNotificationCount(),
      ])
      setItems(list)
      setUnreadCount(count)
    } catch {
      // Keep existing state on transient failures
    } finally {
      setLoading(false)
    }
  }, [canRead])

  React.useEffect(() => {
    if (isLoading || !isAuthenticated || !canRead) return
    void refresh()
  }, [isLoading, isAuthenticated, canRead, refresh])

  React.useEffect(() => {
    if (isLoading || !isAuthenticated || !canRead) return
    return subscribeNotifications(
      (notification) => {
        setItems((prev) => {
          if (prev.some((item) => item.id === notification.id)) return prev
          return [notification, ...prev]
        })
        setUnreadCount((prev) => prev + (notification.is_read ? 0 : 1))
      },
      (count) => setUnreadCount(count)
    )
  }, [isLoading, isAuthenticated, canRead])

  async function markRead(id: string) {
    const existing = items.find((item) => item.id === id)
    const updated = await markNotificationRead(id)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    )
    if (existing && !existing.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  async function markAllRead() {
    await markAllNotificationsRead()
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)
  }

  const value: NotificationsContextValue = {
    items,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = React.useContext(NotificationsContext)
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider")
  }
  return ctx
}
