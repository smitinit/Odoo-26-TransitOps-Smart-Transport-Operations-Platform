"use client"

import { InfoIcon } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function FieldLabel({
  htmlFor,
  children,
  tooltip,
  className,
}: {
  htmlFor?: string
  children: React.ReactNode
  /** Only pass when the field is non-obvious for a typical user. */
  tooltip?: string
  className?: string
}) {
  if (!tooltip) {
    return (
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{children}</Label>
      <TooltipProvider delay={150}>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Field info"
              />
            }
          >
            <InfoIcon className="size-3.5" strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[220px] text-pretty leading-relaxed"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
