"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const allowed = !isLoading && isAuthenticated && Boolean(user?.is_superuser)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    if (!user?.is_superuser) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, isLoading, router, user?.is_superuser])

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking admin access...
      </div>
    )
  }

  return <>{children}</>
}
