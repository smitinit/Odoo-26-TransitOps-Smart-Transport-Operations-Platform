"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { GalleryVerticalEndIcon } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { LoginForm } from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2 md:justify-start">
          <a href="/login" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            TransitOps
          </a>
          <div className="md:ml-auto">
            <ModeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          priority
        />
      </div>
    </div>
  )
}
