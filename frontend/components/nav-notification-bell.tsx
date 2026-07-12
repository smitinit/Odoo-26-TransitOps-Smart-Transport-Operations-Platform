"use client"

import Link from "next/link"
import { BellIcon } from "lucide-react"

import { useNotifications } from "@/components/notifications/notifications-provider"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavNotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative size-8"
      )}
    >
      <BellIcon className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  )
}
