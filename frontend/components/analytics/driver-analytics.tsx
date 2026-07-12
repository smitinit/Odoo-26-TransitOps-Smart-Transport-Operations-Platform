"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard } from "@/components/dashboard/kpi-card"
import type { DriverAnalyticsData } from "@/lib/api/types"

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)
}

export function DriverAnalyticsView({ data }: { data: DriverAnalyticsData }) {
  if (!data.linked) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Link your login to a driver profile to see personal trip analytics.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {data.driver_name ? (
        <p className="text-sm text-muted-foreground">{data.driver_name}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trips Completed" value={data.trips_completed} />
        <KpiCard
          label="Distance Travelled"
          value={`${data.distance_travelled_km} km`}
        />
        <KpiCard
          label="Fuel Consumption"
          value={`₹${formatINR(data.fuel_consumption_cost)}`}
          hint={`${data.fuel_liters} L`}
        />
        <KpiCard
          label="Avg Fuel Efficiency"
          value={`${data.average_fuel_efficiency} km/L`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          My Trips
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.my_trips.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No trips in this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.my_trips.map((t) => (
                  <TableRow key={t.trip_id}>
                    <TableCell className="font-medium">{t.label}</TableCell>
                    <TableCell>
                      {t.distance_km != null ? `${t.distance_km} km` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === "COMPLETED"
                            ? "success"
                            : t.status === "IN_PROGRESS"
                              ? "info"
                              : "outline"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(t.start_time).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
