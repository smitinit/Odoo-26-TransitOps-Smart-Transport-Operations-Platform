import type { User } from "@/lib/api/types"

export function userHasPermission(
  user: User | null | undefined,
  permission: string
): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  return Boolean(user.permissions?.includes(permission))
}

export function userHasAnyPermission(
  user: User | null | undefined,
  permissions: string[]
): boolean {
  return permissions.some((permission) => userHasPermission(user, permission))
}

/** Nav item → required permission (first match wins visibility). */
export const NAV_PERMISSIONS: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/fleet": "vehicle.read",
  "/drivers": "driver.read",
  "/trips": "trip.read",
  "/maintenance": "maintenance.read",
  "/fuel-expenses": "fuel.read",
  "/analytics": "dashboard.view",
  "/settings": "settings.manage",
  "/users": "settings.manage",
}
