"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  "Active Vehicles":
    "Vehicles currently Available or On Trip — the operational fleet in service.",
  "Available Vehicles":
    "Vehicles ready for assignment (status Available).",
  "Vehicles In Shop":
    "Vehicles currently under maintenance or in the workshop.",
  "Retired Vehicles":
    "Vehicles marked Inactive / Retired and removed from dispatch.",
  "Drivers On Duty":
    "Drivers Available or On Trip and eligible for operations.",
  "Active Trips": "Trips currently In Transit.",
  "Pending Trips":
    "Trips that are Planned / Scheduled and waiting to start.",
  "Fleet Utilization %":
    "Share of the active fleet that is currently On Trip.",
  "Expired Licenses":
    "Drivers whose license expiry date is already past.",
  "Licenses Expiring Soon":
    "Drivers with licenses expiring within the next 30 days.",
  "Suspended Drivers":
    "Drivers currently Suspended and blocked from assignment.",
  "Drivers On Trip": "Drivers with status On Trip right now.",
  "Average Safety Score":
    "Mean safety score across all active driver profiles.",
  "Average Driver Rating":
    "Fleet-wide average of driver safety scores.",
  "Violations (score < 85)":
    "Drivers flagged for safety scores below the 85 threshold.",
  "Total Fuel Cost": "Sum of all recorded fuel log costs.",
  "Total Maintenance Cost":
    "Sum of maintenance job costs across the fleet.",
  "Operational Cost":
    "Combined fuel + maintenance cost (core ops spend).",
  "Average Cost Per Vehicle":
    "Operational cost divided by non-retired vehicles.",
  "Fleet ROI":
    "Average estimated return on investment across vehicles.",
  "Monthly Expenses":
    "Fuel, maintenance, and misc expenses for the current month.",
  "Trips Completed":
    "Number of your trips marked Completed in the selected period.",
  "Distance Travelled":
    "Total planned distance across your completed trips.",
  "Fuel Consumption":
    "Fuel spend attributed to your assigned vehicles.",
  "Avg Fuel Efficiency":
    "Distance travelled per liter of fuel (km/L).",
  "Fuel Cost Today":
    "Fuel spend logged for your vehicles today.",
}

export function KpiCard({
  label,
  value,
  hint,
  description,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  description?: string
  className?: string
}) {
  const tooltipText =
    description ?? DEFAULT_DESCRIPTIONS[label] ?? hint ?? `${label}: ${value}`

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Card
              className={cn(
                "@container/card border bg-card shadow-none transition-shadow hover:shadow-sm",
                className
              )}
            />
          }
        >
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[220px]/card:text-3xl">
              {value}
            </CardTitle>
            {hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </CardHeader>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[240px] text-pretty leading-relaxed"
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
