"use client"

import * as React from "react"
import { toast } from "sonner"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ApiError,
  getGeneralSettings,
  updateGeneralSettings,
  type GeneralSettings,
} from "@/lib/api"

const CURRENCY_OPTIONS = [
  { value: "INR (Rs)", label: "INR (Rs)" },
  { value: "USD ($)", label: "USD ($)" },
  { value: "EUR (€)", label: "EUR (€)" },
]

const DISTANCE_OPTIONS = [
  { value: "Kilometers", label: "Kilometers" },
  { value: "Miles", label: "Miles" },
]

const DEFAULTS: GeneralSettings = {
  depot_name: "Gandhinagar Depot GJ4",
  currency: "INR (Rs)",
  distance_unit: "Kilometers",
}

export default function SettingsPage() {
  return (
    <PermissionGuard permission="settings.manage">
      <SettingsContent />
    </PermissionGuard>
  )
}

function SettingsContent() {
  const [depotName, setDepotName] = React.useState(DEFAULTS.depot_name)
  const [currency, setCurrency] = React.useState(DEFAULTS.currency)
  const [distanceUnit, setDistanceUnit] = React.useState(DEFAULTS.distance_unit)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        try {
          const data = await getGeneralSettings()
          setDepotName(data.depot_name)
          setCurrency(data.currency)
          setDistanceUnit(data.distance_unit)
          setDirty(false)
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : "Failed to load settings"
          toast.error(message)
        } finally {
          setLoading(false)
        }
      })()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!depotName.trim()) {
      toast.error("Depot name is required")
      return
    }
    setSaving(true)
    try {
      const data = await updateGeneralSettings({
        depot_name: depotName.trim(),
        currency,
        distance_unit: distanceUnit,
      })
      setDepotName(data.depot_name)
      setCurrency(data.currency)
      setDistanceUnit(data.distance_unit)
      setDirty(false)
      toast.success("Settings saved")
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save settings"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure organization preferences and system defaults.
        </p>
      </div>

      <section className="max-w-xl rounded-2xl border bg-card p-6">
        <h3 className="mb-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          General
        </h3>

        <form className="grid gap-4" onSubmit={(e) => void handleSave(e)}>
          <div className="grid gap-2">
            <Label
              htmlFor="depot-name"
              className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase"
            >
              Depot name
            </Label>
            <Input
              id="depot-name"
              value={depotName}
              disabled={loading || saving}
              onChange={(e) => {
                setDepotName(e.target.value)
                setDirty(true)
              }}
              placeholder="Gandhinagar Depot GJ4"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Currency
            </Label>
            <Select
              value={currency}
              disabled={loading || saving}
              onValueChange={(value) => {
                if (!value) return
                setCurrency(value)
                setDirty(true)
              }}
              items={CURRENCY_OPTIONS}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Distance unit
            </Label>
            <Select
              value={distanceUnit}
              disabled={loading || saving}
              onValueChange={(value) => {
                if (!value) return
                setDistanceUnit(value)
                setDirty(true)
              }}
              items={DISTANCE_OPTIONS}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Select distance unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DISTANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2">
            <Button
              type="submit"
              size="lg"
              className="h-10 rounded-xl px-6"
              disabled={loading || saving || !dirty}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
