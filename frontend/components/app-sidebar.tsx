"use client"

import * as React from "react"
import Link from "next/link"

import { useAuth } from "@/components/auth/auth-provider"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NAV_PERMISSIONS, userHasPermission } from "@/lib/auth/permissions"
import {
  LayoutDashboardIcon,
  TruckIcon,
  UsersIcon,
  RouteIcon,
  WrenchIcon,
  FuelIcon,
  ChartBarIcon,
  Settings2Icon,
  CommandIcon,
  UserCogIcon,
} from "lucide-react"

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
}

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Fleet",
    url: "/fleet",
    icon: <TruckIcon />,
  },
  {
    title: "Drivers",
    url: "/drivers",
    icon: <UsersIcon />,
  },
  {
    title: "Trips",
    url: "/trips",
    icon: <RouteIcon />,
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: <WrenchIcon />,
  },
  {
    title: "Fuel & Expenses",
    url: "/fuel-expenses",
    icon: <FuelIcon />,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: <ChartBarIcon />,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: <Settings2Icon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const displayUser = {
    name: user
      ? `${user.first_name} ${user.last_name}`.trim() || user.email
      : "Guest",
    email: user?.email ?? "",
  }

  const items = [
    ...(user?.is_superuser
      ? [
          {
            title: "Users",
            url: "/users",
            icon: <UserCogIcon />,
          } satisfies NavItem,
        ]
      : []),
    ...navMain.filter((item) => {
      const permission = NAV_PERMISSIONS[item.url]
      if (!permission) return true
      // Settings only for settings.manage; Analytics shares dashboard.view
      if (item.url === "/fuel-expenses") {
        return (
          userHasPermission(user, "fuel.read") ||
          userHasPermission(user, "expense.read")
        )
      }
      return userHasPermission(user, permission)
    }),
  ]

  // Keep Users after Dashboard when superuser
  const orderedItems = user?.is_superuser
    ? [
        ...items.filter((i) => i.url === "/dashboard"),
        ...items.filter((i) => i.url === "/users"),
        ...items.filter((i) => i.url !== "/dashboard" && i.url !== "/users"),
      ]
    : items

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">TransitOps</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={orderedItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
