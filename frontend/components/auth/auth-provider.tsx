"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import * as authApi from "@/lib/api/auth"
import { clearTokens, hasAccessToken } from "@/lib/api/tokens"
import { userHasPermission } from "@/lib/auth/permissions"
import type { User } from "@/lib/api/types"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  const refreshUser = React.useCallback(async () => {
    if (!hasAccessToken()) {
      setUser(null)
      return
    }

    const currentUser = await authApi.getCurrentUser()
    setUser(currentUser)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        if (!hasAccessToken()) {
          if (!cancelled) setUser(null)
          return
        }
        const currentUser = await authApi.getCurrentUser()
        if (!cancelled) setUser(currentUser)
      } catch {
        clearTokens()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = React.useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password)
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
      router.replace("/dashboard")
    },
    [router]
  )

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      clearTokens()
    } finally {
      setUser(null)
      router.replace("/login")
    }
  }, [router])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
      hasPermission: (permission: string) => userHasPermission(user, permission),
    }),
    [user, isLoading, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
