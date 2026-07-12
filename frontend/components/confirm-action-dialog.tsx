"use client"

import type { ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  destructive = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void | Promise<void>
  destructive?: boolean
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            className={
              destructive
                ? "border-transparent bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
                : undefined
            }
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
