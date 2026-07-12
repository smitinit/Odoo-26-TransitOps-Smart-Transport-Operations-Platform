"use client"

import {
  ChartCard,
  NamedBarChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import type { SafetyAnalyticsData } from "@/lib/api/types"

export function SafetyAnalyticsView({ data }: { data: SafetyAnalyticsData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Average Driver Rating"
          value={data.average_driver_rating}
        />
        <KpiCard label="Violations (score < 85)" value={data.violation_count} />
        <KpiCard label="Suspended Drivers" value={data.suspended_count} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="License Expiry Trend">
          <TrendLineChart
            data={data.license_expiry_trend}
            valueLabel="Expiries"
          />
        </ChartCard>
        <ChartCard title="Safety Score Trend">
          <TrendLineChart
            data={data.safety_score_trend}
            valueLabel="Avg score"
          />
        </ChartCard>
        <ChartCard title="Violations">
          <NamedBarChart data={data.violations} valueLabel="Safety score" />
        </ChartCard>
        <ChartCard title="Suspended Drivers">
          {data.suspended_drivers.length ? (
            <NamedBarChart
              data={data.suspended_drivers}
              valueLabel="Safety score"
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No suspended drivers.
            </p>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
