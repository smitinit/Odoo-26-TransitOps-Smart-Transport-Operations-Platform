"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"
import { hasAccessToken } from "@/lib/api/tokens"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const allowed = !isLoading && isAuthenticated && hasAccessToken()

  useEffect(() => {
    if (isLoading) return
    if (!hasAccessToken() || !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking session...
      </div>
    )
  }

  return <>{children}</>
}
