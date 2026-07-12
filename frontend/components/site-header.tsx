"use client"

import { usePathname } from "next/navigation"

import { ModeToggle } from "@/components/mode-toggle"
import { NavFeatureSearch } from "@/components/nav-feature-search"
import { NavNotificationBell } from "@/components/nav-notification-bell"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/drivers": "Drivers & Safety",
  "/fleet": "Vehicle Registry",
  "/trips": "Trip Dispatcher",
  "/maintenance": "Maintenance",
  "/fuel-expenses": "Fuel & Expenses",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/account": "Account",
  "/notifications": "Notifications",
  "/users": "Users",
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = titles[pathname] ?? "TransitOps"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <NavFeatureSearch />
          <NavNotificationBell />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
