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
} from "lucide-react"

const navMain = [
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
