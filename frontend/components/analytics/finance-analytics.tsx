"use client"

import {
  ChartCard,
  NamedBarChart,
  StatusPieChart,
  TrendLineChart,
} from "@/components/dashboard/charts"
import type { FinanceAnalyticsData } from "@/lib/api/types"

export function FinanceAnalyticsView({ data }: { data: FinanceAnalyticsData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fuel Cost Over Time">
          <TrendLineChart data={data.fuel_cost_over_time} valueLabel="Fuel ₹" />
        </ChartCard>
        <ChartCard title="Maintenance Cost">
          <TrendLineChart data={data.maintenance_cost} valueLabel="Maint ₹" />
        </ChartCard>
        <ChartCard title="Expense Breakdown">
          <StatusPieChart data={data.expense_breakdown} />
        </ChartCard>
        <ChartCard title="Operational Cost Trend">
          <TrendLineChart
            data={data.operational_cost_trend}
            valueLabel="Ops ₹"
          />
        </ChartCard>
        <ChartCard title="ROI Per Vehicle">
          <NamedBarChart data={data.roi_per_vehicle} valueLabel="ROI %" />
        </ChartCard>
        <ChartCard title="Top Costly Vehicles">
          <NamedBarChart data={data.top_costly_vehicles} valueLabel="Cost ₹" />
        </ChartCard>
        <ChartCard title="Fuel Efficiency Comparison">
          <NamedBarChart
            data={data.fuel_efficiency_comparison}
            valueLabel="km / L"
          />
        </ChartCard>
        <ChartCard title="Monthly Profitability">
          <TrendLineChart
            data={data.monthly_profitability}
            valueLabel="Profit ₹"
          />
        </ChartCard>
      </div>
    </div>
  )
}
