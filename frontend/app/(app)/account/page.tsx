"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function AccountPage() {
  const { user } = useAuth()
  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : ""
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile details and account preferences.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-16 rounded-xl">
            <AvatarFallback className="rounded-xl text-lg">
              {initials || "TO"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <p className="font-medium">{fullName || "—"}</p>
            <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {user?.is_superuser ? "Superuser" : "Signed in"}
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={fullName} readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ""}
              readOnly
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first-name">First name</Label>
            <Input id="first-name" value={user?.first_name ?? ""} readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input id="last-name" value={user?.last_name ?? ""} readOnly />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled>
            Edit profile coming soon
          </Button>
        </div>
      </div>
    </div>
  )
}
