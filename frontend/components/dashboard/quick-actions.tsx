import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type QuickAction = {
  label: string
  href: string
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (!actions.length) return null
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Quick Actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
