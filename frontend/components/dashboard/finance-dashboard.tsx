"use client"

import {
  ChartCard,
  NamedBarChart,
  StatusPieChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { FinanceDashboardData } from "@/lib/api/types"

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)
}

export function FinanceDashboardView({ data }: { data: FinanceDashboardData }) {
  const { kpis } = data
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Fuel Cost"
          value={`₹${formatINR(kpis.total_fuel_cost)}`}
        />
        <KpiCard
          label="Total Maintenance Cost"
          value={`₹${formatINR(kpis.total_maintenance_cost)}`}
        />
        <KpiCard
          label="Operational Cost"
          value={`₹${formatINR(kpis.operational_cost)}`}
          hint="Fuel + Maintenance"
        />
        <KpiCard
          label="Average Cost Per Vehicle"
          value={`₹${formatINR(kpis.average_cost_per_vehicle)}`}
        />
        <KpiCard
          label="Fleet ROI"
          value={`${kpis.fleet_roi_pct.toFixed(1)}%`}
        />
        <KpiCard
          label="Monthly Expenses"
          value={`₹${formatINR(kpis.monthly_expenses)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fuel Cost Trend">
          <TrendLineChart data={data.fuel_cost_trend} valueLabel="Fuel ₹" />
        </ChartCard>
        <ChartCard title="Maintenance Cost Trend">
          <TrendLineChart
            data={data.maintenance_cost_trend}
            valueLabel="Maint ₹"
          />
        </ChartCard>
        <ChartCard title="ROI by Vehicle">
          <NamedBarChart data={data.roi_by_vehicle} valueLabel="ROI %" />
        </ChartCard>
        <ChartCard title="Cost Breakdown">
          <StatusPieChart data={data.cost_breakdown} />
        </ChartCard>
      </div>

      <QuickActions
        actions={[
          { label: "Fuel & Expenses", href: "/fuel-expenses" },
          { label: "Maintenance", href: "/maintenance" },
          { label: "Fleet Registry", href: "/fleet" },
        ]}
      />
    </div>
  )
}
