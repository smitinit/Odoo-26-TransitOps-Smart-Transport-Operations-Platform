"use client"

import {
  ChartCard,
  NamedBarChart,
  StatusPieChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FleetDashboardData } from "@/lib/api/types"

function formatPct(n: number) {
  return `${n.toFixed(1)}%`
}

export function FleetDashboard({
  data,
  filters,
  onFiltersChange,
  canRegisterVehicle,
  canRegisterDriver,
  canScheduleMaintenance,
}: {
  data: FleetDashboardData
  filters: { vehicle_type: string; status: string; region: string }
  onFiltersChange: (next: {
    vehicle_type: string
    status: string
    region: string
  }) => void
  canRegisterVehicle: boolean
  canRegisterDriver: boolean
  canScheduleMaintenance: boolean
}) {
  const { kpis, charts, filter_options } = data

  const actions = [
    canRegisterVehicle
      ? { label: "Register Vehicle", href: "/fleet" }
      : null,
    canRegisterDriver
      ? { label: "Register Driver", href: "/drivers" }
      : null,
    canScheduleMaintenance
      ? { label: "Schedule Maintenance", href: "/maintenance" }
      : null,
    { label: "View Trips", href: "/trips" },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>Vehicle type</Label>
          <Select
            value={filters.vehicle_type}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                vehicle_type: value ?? "ALL",
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filter_options.vehicle_types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "ALL" ? "All types" : t}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value ?? "ALL" })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filter_options.statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "ALL" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Region</Label>
          <Select
            value={filters.region}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, region: value ?? "ALL" })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filter_options.regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "ALL" ? "All regions" : r}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Vehicles" value={kpis.active_vehicles} />
        <KpiCard label="Available Vehicles" value={kpis.available_vehicles} />
        <KpiCard label="Vehicles In Shop" value={kpis.vehicles_in_shop} />
        <KpiCard label="Retired Vehicles" value={kpis.retired_vehicles} />
        <KpiCard label="Drivers On Duty" value={kpis.drivers_on_duty} />
        <KpiCard label="Active Trips" value={kpis.active_trips} />
        <KpiCard label="Pending Trips" value={kpis.pending_trips} />
        <KpiCard
          label="Fleet Utilization %"
          value={formatPct(kpis.fleet_utilization_pct)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Vehicle Status">
          <StatusPieChart data={charts.vehicle_status} />
        </ChartCard>
        <ChartCard title="Trips by Region">
          <NamedBarChart data={charts.trips_by_region} valueLabel="Trips" />
        </ChartCard>
        <ChartCard title="Fleet Utilization Trend">
          <TrendLineChart
            data={charts.utilization_trend}
            valueLabel="Utilization %"
          />
        </ChartCard>
        <ChartCard title="Vehicles Near Maintenance">
          {charts.vehicles_near_maintenance.length ? (
            <NamedBarChart
              data={charts.vehicles_near_maintenance}
              valueLabel="Est. cost"
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No upcoming maintenance.
            </p>
          )}
        </ChartCard>
      </div>

      <QuickActions actions={actions} />
    </div>
  )
}
