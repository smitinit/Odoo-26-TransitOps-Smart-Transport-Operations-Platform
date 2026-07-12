"use client"

import {
  ChartCard,
  NamedBarChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { SafetyDashboardData } from "@/lib/api/types"

export function SafetyDashboardView({ data }: { data: SafetyDashboardData }) {
  const { kpis } = data
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Expired Licenses" value={kpis.expired_licenses} />
        <KpiCard label="Licenses Expiring Soon" value={kpis.expiring_soon} />
        <KpiCard label="Suspended Drivers" value={kpis.suspended_drivers} />
        <KpiCard label="Drivers On Trip" value={kpis.drivers_on_trip} />
        <KpiCard
          label="Average Safety Score"
          value={kpis.average_safety_score}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="License Expiry Timeline">
          <TrendLineChart
            data={data.license_expiry_timeline}
            valueLabel="Licenses"
          />
        </ChartCard>
        <ChartCard title="Safety Score Distribution">
          <NamedBarChart
            data={data.safety_score_distribution}
            valueLabel="Drivers"
          />
        </ChartCard>
      </div>

      <QuickActions
        actions={[
          { label: "Manage Drivers", href: "/drivers" },
          { label: "View Trips", href: "/trips" },
        ]}
      />
    </div>
  )
}
