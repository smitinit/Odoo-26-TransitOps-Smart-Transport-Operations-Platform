"use client"

import * as React from "react"
import { toast } from "sonner"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { DriverDashboardView } from "@/components/dashboard/driver-dashboard"
import { FinanceDashboardView } from "@/components/dashboard/finance-dashboard"
import { FleetDashboard } from "@/components/dashboard/fleet-dashboard"
import { SafetyDashboardView } from "@/components/dashboard/safety-dashboard"
import {
  ApiError,
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/api"

export default function DashboardPage() {
  return (
    <PermissionGuard permission="dashboard.view">
      <DashboardWorkspace />
    </PermissionGuard>
  )
}

function DashboardWorkspace() {
  const { user, hasPermission } = useAuth()
  const [data, setData] = React.useState<DashboardOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    vehicle_type: "ALL",
    status: "ALL",
    region: "ALL",
  })

  async function load(nextFilters = filters) {
    setLoading(true)
    try {
      const overview = await getDashboardOverview(nextFilters)
      setData(overview)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load dashboard"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFiltersChange(next: typeof filters) {
    setFilters(next)
    void load(next)
  }

  const title =
    data?.view === "driver"
      ? "Driver Dashboard"
      : data?.view === "safety"
        ? "Safety Officer Dashboard"
        : data?.view === "finance"
          ? "Financial Analyst Dashboard"
          : "Fleet Manager Dashboard"

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          What&apos;s happening right now
          {user?.role_name ? ` · ${user.role_name}` : ""}
        </p>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading live KPIs…</p>
      ) : null}

      {data?.view === "fleet" && data.fleet ? (
        <FleetDashboard
          data={data.fleet}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          canRegisterVehicle={hasPermission("vehicle.create")}
          canRegisterDriver={hasPermission("driver.create")}
          canScheduleMaintenance={hasPermission("maintenance.create")}
        />
      ) : null}

      {data?.view === "driver" && data.driver ? (
        <DriverDashboardView data={data.driver} />
      ) : null}

      {data?.view === "safety" && data.safety ? (
        <SafetyDashboardView data={data.safety} />
      ) : null}

      {data?.view === "finance" && data.finance ? (
        <FinanceDashboardView data={data.finance} />
      ) : null}

      {!loading && data && !data.fleet && !data.driver && !data.safety && !data.finance ? (
        <p className="text-sm text-muted-foreground">
          No dashboard widgets for this role yet.
        </p>
      ) : null}
    </div>
  )
}
