"use client"

import { SearchIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/fleet": "Fleet",
  "/drivers": "Drivers",
  "/trips": "Trips",
  "/maintenance": "Maintenance",
  "/fuel-expenses": "Fuel & Expenses",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/account": "Account",
  "/notifications": "Notifications",
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
        <div className="ml-auto flex items-center">
          <div className="relative w-48 sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8"
              aria-label="Search"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
