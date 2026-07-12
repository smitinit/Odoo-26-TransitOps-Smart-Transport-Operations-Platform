"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"
import {
  userHasAnyPermission,
  userHasPermission,
} from "@/lib/auth/permissions"

export function PermissionGuard({
  permission,
  anyOf,
  children,
  fallbackHref = "/dashboard",
}: {
  permission?: string
  anyOf?: string[]
  children: React.ReactNode
  fallbackHref?: string
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const allowed =
    !isLoading &&
    isAuthenticated &&
    (anyOf
      ? userHasAnyPermission(user, anyOf)
      : permission
        ? userHasPermission(user, permission)
        : false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    const ok = anyOf
      ? userHasAnyPermission(user, anyOf)
      : permission
        ? userHasPermission(user, permission)
        : false
    if (!ok) {
      router.replace(fallbackHref)
    }
  }, [anyOf, fallbackHref, isAuthenticated, isLoading, permission, router, user])

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    )
  }

  return <>{children}</>
}
