"use client"

import * as React from "react"
import { toast } from "sonner"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { DriverAnalyticsView } from "@/components/analytics/driver-analytics"
import { FinanceAnalyticsView } from "@/components/analytics/finance-analytics"
import { FleetAnalyticsView } from "@/components/analytics/fleet-analytics"
import { SafetyAnalyticsView } from "@/components/analytics/safety-analytics"
import {
  ApiError,
  getAnalyticsOverview,
  type AnalyticsOverview,
} from "@/lib/api"

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().slice(0, 10)
}

function defaultDateTo() {
  return new Date().toISOString().slice(0, 10)
}

export default function AnalyticsPage() {
  return (
    <PermissionGuard permission="dashboard.view">
      <AnalyticsWorkspace />
    </PermissionGuard>
  )
}

function AnalyticsWorkspace() {
  const { user } = useAuth()
  const [data, setData] = React.useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    vehicle_id: "ALL",
    vehicle_type: "ALL",
    region: "ALL",
    date_from: defaultDateFrom(),
    date_to: defaultDateTo(),
  })

  async function load(next = filters) {
    setLoading(true)
    try {
      const overview = await getAnalyticsOverview({
        vehicle_id: next.vehicle_id,
        vehicle_type: next.vehicle_type,
        region: next.region,
        date_from: next.date_from,
        date_to: next.date_to,
      })
      setData(overview)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load analytics"
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
      ? "Driver Analytics"
      : data?.view === "safety"
        ? "Safety Officer Analytics"
        : data?.view === "finance"
          ? "Financial Analyst Analytics"
          : "Fleet Manager Analytics"

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Why is this happening?
          {user?.role_name ? ` · ${user.role_name}` : ""}
        </p>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : null}

      {data?.view === "fleet" && data.fleet ? (
        <FleetAnalyticsView
          data={data.fleet}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      ) : null}

      {data?.view === "driver" && data.driver ? (
        <DriverAnalyticsView data={data.driver} />
      ) : null}

      {data?.view === "safety" && data.safety ? (
        <SafetyAnalyticsView data={data.safety} />
      ) : null}

      {data?.view === "finance" && data.finance ? (
        <FinanceAnalyticsView data={data.finance} />
      ) : null}
    </div>
  )
}
