"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { AuthGuard } from "@/components/auth/auth-guard"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <NotificationsProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </NotificationsProvider>
    </AuthGuard>
  )
}
