"use client"

import {
  ChartCard,
  NamedBarChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FleetAnalyticsData } from "@/lib/api/types"

function parseVehicleOption(raw: string) {
  if (raw === "ALL") return { value: "ALL", label: "All vehicles" }
  const [id, ...rest] = raw.split("|")
  return { value: id, label: rest.join("|") || id }
}

export function FleetAnalyticsView({
  data,
  filters,
  onFiltersChange,
}: {
  data: FleetAnalyticsData
  filters: {
    vehicle_id: string
    vehicle_type: string
    region: string
    date_from: string
    date_to: string
  }
  onFiltersChange: (next: typeof filters) => void
}) {
  const vehicleOptions = data.filter_options.vehicles.map(parseVehicleOption)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>Vehicle</Label>
          <Select
            value={filters.vehicle_id}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, vehicle_id: value ?? "ALL" })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {vehicleOptions.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Vehicle type</Label>
          <Select
            value={filters.vehicle_type}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, vehicle_type: value ?? "ALL" })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {data.filter_options.vehicle_types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "ALL" ? "All types" : t}
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
                {data.filter_options.regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "ALL" ? "All regions" : r}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date_from">From</Label>
          <Input
            id="date_from"
            type="date"
            className="w-[160px]"
            value={filters.date_from}
            onChange={(e) =>
              onFiltersChange({ ...filters, date_from: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date_to">To</Label>
          <Input
            id="date_to"
            type="date"
            className="w-[160px]"
            value={filters.date_to}
            onChange={(e) =>
              onFiltersChange({ ...filters, date_to: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fleet Utilization Trend">
          <TrendLineChart
            data={data.utilization_trend}
            valueLabel="Utilization %"
          />
        </ChartCard>
        <ChartCard title="Vehicle Usage">
          <NamedBarChart data={data.vehicle_usage} valueLabel="Trips" />
        </ChartCard>
        <ChartCard title="Maintenance Frequency">
          <NamedBarChart
            data={data.maintenance_frequency}
            valueLabel="Jobs"
          />
        </ChartCard>
        <ChartCard title="Downtime Analysis">
          <NamedBarChart data={data.downtime_analysis} valueLabel="Jobs" />
        </ChartCard>
        <ChartCard title="Vehicle Availability">
          <NamedBarChart
            data={data.vehicle_availability}
            valueLabel="Available %"
          />
        </ChartCard>
        <ChartCard title="Cost per KM">
          <NamedBarChart data={data.cost_per_km} valueLabel="₹ / km" />
        </ChartCard>
      </div>
    </div>
  )
}
