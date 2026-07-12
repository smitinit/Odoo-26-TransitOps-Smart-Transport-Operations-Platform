"use client"

import type { ComponentType, ReactNode } from "react"
import Link from "next/link"
import {
  KeyRoundIcon,
  LogOutIcon,
  MailIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { userHasPermission } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

function DetailRow({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: ReactNode
  iconClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-1 py-2.5">
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
          iconClassName
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { user, logout, isLoading } = useAuth()
  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : ""
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  const roleLabel = user?.is_superuser
    ? "Superuser"
    : user?.role_name || "Member"
  const canManageSettings = userHasPermission(user, "settings.manage")
  const permissions = user?.permissions ?? []

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-muted-foreground">
        Loading account...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-muted-foreground">
        Sign in to view your account.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your TransitOps profile and access summary.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Profile card */}
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b bg-muted/40 px-6 py-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-20 rounded-2xl ring-2 ring-background shadow-sm">
                <AvatarFallback className="rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
                  {initials || "TO"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-semibold tracking-tight">
                    {fullName}
                  </h3>
                  <Badge
                    variant={user.is_superuser ? "default" : "secondary"}
                    className="rounded-md"
                  >
                    {roleLabel}
                  </Badge>
                  <Badge
                    variant={user.is_active ? "success" : "destructive"}
                    className="rounded-md"
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MailIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-1 px-5 py-4 sm:grid-cols-2">
            <DetailRow
              icon={UserRoundIcon}
              label="First name"
              value={user.first_name || "—"}
              iconClassName="text-sky-600 dark:text-sky-400"
            />
            <DetailRow
              icon={UserRoundIcon}
              label="Last name"
              value={user.last_name || "—"}
              iconClassName="text-violet-600 dark:text-violet-400"
            />
            <DetailRow
              icon={MailIcon}
              label="Email"
              value={user.email}
              iconClassName="text-orange-600 dark:text-orange-400"
            />
            <DetailRow
              icon={ShieldCheckIcon}
              label="Role"
              value={roleLabel}
              iconClassName="text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </section>

        {/* Access + actions */}
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Access
              </h3>
            </div>

            {user.is_superuser ? (
              <p className="text-sm text-muted-foreground">
                Full platform access as superuser — all permissions granted.
              </p>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No explicit permissions assigned to this account.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((permission) => (
                  <Badge
                    key={permission}
                    variant="outline"
                    className="rounded-md font-mono text-[11px] font-normal"
                  >
                    {permission}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Actions
            </h3>
            <div className="flex flex-col gap-2">
              {canManageSettings ? (
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 justify-start rounded-xl"
                  )}
                >
                  <Settings2Icon />
                  Organization settings
                </Link>
              ) : null}
              <Separator className="my-1" />
              <Button
                variant="destructive"
                className="h-10 justify-start rounded-xl border-transparent bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                onClick={() => {
                  void logout()
                }}
              >
                <LogOutIcon />
                Sign out
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
