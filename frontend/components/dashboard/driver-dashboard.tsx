"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { DriverDashboardData } from "@/lib/api/types"

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)
}

export function DriverDashboardView({ data }: { data: DriverDashboardData }) {
  const trip = data.active_trip

  if (!data.linked) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Your login is not linked to a driver profile yet. Ask an admin to link
        your user to a driver record to see personal trip KPIs.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {data.driver_name ? `Welcome, ${data.driver_name}` : "My operations"}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">My Active Trip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip?.trip_id ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{trip.trip_label}</p>
                  <Badge
                    variant={
                      trip.status === "COMPLETED"
                        ? "success"
                        : trip.status === "IN_PROGRESS"
                          ? "info"
                          : "secondary"
                    }
                  >
                    {trip.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Assigned Vehicle</p>
                    <p className="font-medium">
                      {trip.vehicle_model || trip.vehicle_reg || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trip Status</p>
                    <p className="font-medium">{trip.status || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distance Remaining</p>
                    <p className="font-medium">
                      {trip.distance_remaining_km != null
                        ? `${trip.distance_remaining_km} km`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel Consumed</p>
                    <p className="font-medium">
                      ₹{formatINR(trip.fuel_consumed_cost)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No trip in progress right now.
              </p>
            )}
          </CardContent>
        </Card>
        <KpiCard
          label="Fuel Cost Today"
          value={`₹${formatINR(data.fuel_consumed_today)}`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today&apos;s Trips
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.today_trips.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No trips scheduled for today.
                  </TableCell>
                </TableRow>
              ) : (
                data.today_trips.map((t) => (
                  <TableRow key={t.trip_id}>
                    <TableCell className="font-medium">{t.label}</TableCell>
                    <TableCell>{t.vehicle_reg || "—"}</TableCell>
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
                      {new Date(t.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <QuickActions
        actions={[
          { label: "Start Trip", href: "/trips" },
          { label: "Complete Trip", href: "/trips" },
          { label: "Add Fuel Log", href: "/fuel-expenses" },
          { label: "Add Expense", href: "/fuel-expenses" },
        ]}
      />
    </div>
  )
}
