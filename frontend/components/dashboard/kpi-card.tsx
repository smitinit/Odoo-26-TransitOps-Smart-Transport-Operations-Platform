"use client"

import type { LucideIcon } from "lucide-react"
import {
  AlertTriangleIcon,
  BanIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  FuelIcon,
  GaugeIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  RouteIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"

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

const KPI_ICONS: Record<
  string,
  { icon: LucideIcon; color: string; hoverBg: string }
> = {
  "Active Vehicles": {
    icon: TruckIcon,
    color: "text-sky-600 dark:text-sky-400",
    hoverBg: "hover:bg-sky-500/20 dark:hover:bg-sky-400/20",
  },
  "Available Vehicles": {
    icon: CheckCircle2Icon,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20",
  },
  "Vehicles In Shop": {
    icon: WrenchIcon,
    color: "text-amber-600 dark:text-amber-400",
    hoverBg: "hover:bg-amber-500/20 dark:hover:bg-amber-400/20",
  },
  "Retired Vehicles": {
    icon: BanIcon,
    color: "text-rose-600 dark:text-rose-400",
    hoverBg: "hover:bg-rose-500/20 dark:hover:bg-rose-400/20",
  },
  "Drivers On Duty": {
    icon: UsersIcon,
    color: "text-blue-600 dark:text-blue-400",
    hoverBg: "hover:bg-blue-500/20 dark:hover:bg-blue-400/20",
  },
  "Active Trips": {
    icon: RouteIcon,
    color: "text-violet-600 dark:text-violet-400",
    hoverBg: "hover:bg-violet-500/20 dark:hover:bg-violet-400/20",
  },
  "Pending Trips": {
    icon: CalendarClockIcon,
    color: "text-orange-600 dark:text-orange-400",
    hoverBg: "hover:bg-orange-500/20 dark:hover:bg-orange-400/20",
  },
  "Fleet Utilization %": {
    icon: GaugeIcon,
    color: "text-cyan-600 dark:text-cyan-400",
    hoverBg: "hover:bg-cyan-500/20 dark:hover:bg-cyan-400/20",
  },
  "Expired Licenses": {
    icon: IdCardIcon,
    color: "text-rose-600 dark:text-rose-400",
    hoverBg: "hover:bg-rose-500/20 dark:hover:bg-rose-400/20",
  },
  "Licenses Expiring Soon": {
    icon: CalendarClockIcon,
    color: "text-amber-600 dark:text-amber-400",
    hoverBg: "hover:bg-amber-500/20 dark:hover:bg-amber-400/20",
  },
  "Suspended Drivers": {
    icon: BanIcon,
    color: "text-rose-600 dark:text-rose-400",
    hoverBg: "hover:bg-rose-500/20 dark:hover:bg-rose-400/20",
  },
  "Drivers On Trip": {
    icon: RouteIcon,
    color: "text-violet-600 dark:text-violet-400",
    hoverBg: "hover:bg-violet-500/20 dark:hover:bg-violet-400/20",
  },
  "Average Safety Score": {
    icon: ShieldCheckIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20",
  },
  "Average Driver Rating": {
    icon: ShieldCheckIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20",
  },
  "Violations (score < 85)": {
    icon: AlertTriangleIcon,
    color: "text-amber-600 dark:text-amber-400",
    hoverBg: "hover:bg-amber-500/20 dark:hover:bg-amber-400/20",
  },
  "Total Fuel Cost": {
    icon: FuelIcon,
    color: "text-orange-600 dark:text-orange-400",
    hoverBg: "hover:bg-orange-500/20 dark:hover:bg-orange-400/20",
  },
  "Total Maintenance Cost": {
    icon: WrenchIcon,
    color: "text-amber-600 dark:text-amber-400",
    hoverBg: "hover:bg-amber-500/20 dark:hover:bg-amber-400/20",
  },
  "Operational Cost": {
    icon: CircleDollarSignIcon,
    color: "text-slate-600 dark:text-slate-300",
    hoverBg: "hover:bg-slate-500/20 dark:hover:bg-slate-400/20",
  },
  "Average Cost Per Vehicle": {
    icon: CircleDollarSignIcon,
    color: "text-slate-600 dark:text-slate-300",
    hoverBg: "hover:bg-slate-500/20 dark:hover:bg-slate-400/20",
  },
  "Fleet ROI": {
    icon: TrendingUpIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20",
  },
  "Monthly Expenses": {
    icon: CircleDollarSignIcon,
    color: "text-indigo-600 dark:text-indigo-400",
    hoverBg: "hover:bg-indigo-500/20 dark:hover:bg-indigo-400/20",
  },
  "Trips Completed": {
    icon: CheckCircle2Icon,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20",
  },
  "Distance Travelled": {
    icon: MapPinIcon,
    color: "text-sky-600 dark:text-sky-400",
    hoverBg: "hover:bg-sky-500/20 dark:hover:bg-sky-400/20",
  },
  "Fuel Consumption": {
    icon: FuelIcon,
    color: "text-orange-600 dark:text-orange-400",
    hoverBg: "hover:bg-orange-500/20 dark:hover:bg-orange-400/20",
  },
  "Avg Fuel Efficiency": {
    icon: GaugeIcon,
    color: "text-cyan-600 dark:text-cyan-400",
    hoverBg: "hover:bg-cyan-500/20 dark:hover:bg-cyan-400/20",
  },
  "Fuel Cost Today": {
    icon: FuelIcon,
    color: "text-orange-600 dark:text-orange-400",
    hoverBg: "hover:bg-orange-500/20 dark:hover:bg-orange-400/20",
  },
}

function resolveIcon(
  label: string,
  IconProp?: LucideIcon
): { icon: LucideIcon; color: string; hoverBg: string } {
  const entry = KPI_ICONS[label]
  if (IconProp) {
    return {
      icon: IconProp,
      color: entry?.color ?? "text-muted-foreground",
      hoverBg: entry?.hoverBg ?? "hover:bg-muted-foreground/20",
    }
  }
  return (
    entry ?? {
      icon: LayoutDashboardIcon,
      color: "text-muted-foreground",
      hoverBg: "hover:bg-muted-foreground/20",
    }
  )
}

export function KpiCard({
  label,
  value,
  hint,
  description,
  icon,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  description?: string
  icon?: LucideIcon
  className?: string
}) {
  const tooltipText =
    description ?? DEFAULT_DESCRIPTIONS[label] ?? hint ?? `${label}: ${value}`
  const { icon: Icon, color, hoverBg } = resolveIcon(label, icon)

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Card
              className={cn(
                "@container/card group border bg-card shadow-none",
                "transition-[background-color,border-color] duration-300 ease-in-out",
                "hover:border-transparent",
                hoverBg,
                className
              )}
            />
          }
        >
          <CardHeader className="relative gap-1 pr-10">
            <Icon
              className={cn("absolute top-4 right-4 size-5", color)}
              aria-hidden
            />
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
