"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  ChartBarIcon,
  FuelIcon,
  LayoutDashboardIcon,
  RouteIcon,
  SearchIcon,
  Settings2Icon,
  TruckIcon,
  UserCogIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { Input } from "@/components/ui/input"
import { NAV_PERMISSIONS, userHasPermission } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

type Feature = {
  title: string
  url: string
  icon: LucideIcon
  color: string
}

const FEATURES: Feature[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    title: "Users",
    url: "/users",
    icon: UserCogIcon,
    color: "text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Fleet",
    url: "/fleet",
    icon: TruckIcon,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Drivers",
    url: "/drivers",
    icon: UsersIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Trips",
    url: "/trips",
    icon: RouteIcon,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: WrenchIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Fuel & Expenses",
    url: "/fuel-expenses",
    icon: FuelIcon,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartBarIcon,
    color: "text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2Icon,
    color: "text-slate-600 dark:text-slate-300",
  },
]

function canAccessFeature(
  user: ReturnType<typeof useAuth>["user"],
  url: string
) {
  if (url === "/users") return Boolean(user?.is_superuser)
  if (url === "/fuel-expenses") {
    return (
      userHasPermission(user, "fuel.read") ||
      userHasPermission(user, "expense.read")
    )
  }
  const permission = NAV_PERMISSIONS[url]
  if (!permission) return true
  return userHasPermission(user, permission)
}

export function NavFeatureSearch() {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)

  const features = FEATURES.filter((feature) => canAccessFeature(user, feature.url))
  const trimmed = query.trim().toLowerCase()
  const filtered =
    trimmed.length === 0
      ? []
      : features.filter((feature) =>
          feature.title.toLowerCase().includes(trimmed)
        )
  const showResults = open && trimmed.length > 0

  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function goTo(url: string) {
    setQuery("")
    setOpen(false)
    router.push(url)
  }

  return (
    <div ref={rootRef} className="relative w-52 sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false)
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "Enter" && filtered[0]) {
            e.preventDefault()
            goTo(filtered[0].url)
          }
        }}
        placeholder="Search features..."
        className="pl-8"
        aria-label="Search features"
        aria-expanded={showResults}
        aria-controls="nav-feature-results"
      />

      {showResults ? (
        <div
          id="nav-feature-results"
          className="absolute top-[calc(100%+0.4rem)] right-0 z-50 w-full overflow-hidden rounded-xl border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No features found
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {filtered.map((feature) => {
                const Icon = feature.icon
                const active = pathname === feature.url
                return (
                  <li key={feature.url}>
                    <Link
                      href={feature.url}
                      role="option"
                      aria-selected={active}
                      onClick={(e) => {
                        e.preventDefault()
                        goTo(feature.url)
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        "hover:bg-muted",
                        active && "bg-muted font-medium"
                      )}
                    >
                      <Icon
                        className={cn("size-4 shrink-0", feature.color)}
                        aria-hidden
                      />
                      <span>{feature.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
