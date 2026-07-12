"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
  type Driver,
  type DriverStatus,
} from "@/lib/api"

const LICENSE_CATEGORIES = ["LMV", "HMV"] as const

const STATUS_OPTIONS: { value: DriverStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "OFF_DUTY", label: "Off Duty" },
  { value: "SUSPENDED", label: "Suspended" },
]

const STATUS_META: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive" | "success" | "info"
  }
> = {
  AVAILABLE: { label: "Available", variant: "default" },
  ACTIVE: { label: "Available", variant: "default" },
  ON_TRIP: { label: "On Trip", variant: "info" },
  OFF_DUTY: { label: "Off Duty", variant: "outline" },
  ON_LEAVE: { label: "Off Duty", variant: "outline" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  TERMINATED: { label: "Suspended", variant: "destructive" },
}

type FormState = {
  first_name: string
  last_name: string
  license_number: string
  license_category: string
  license_expiry: string
  contact_number: string
  safety_score: string
  trip_completion_pct: string
  status: DriverStatus
}

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  license_number: "",
  license_category: "LMV",
  license_expiry: "",
  contact_number: "",
  safety_score: "100",
  trip_completion_pct: "",
  status: "AVAILABLE",
}

function formatExpiry(value: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = d.getUTCFullYear()
  return `${mm}/${yyyy}`
}

function formatTripCompl(value: number | null) {
  if (value == null) return "—"
  return `${Math.round(value)}%`
}

export default function DriversPage() {
  return (
    <PermissionGuard permission="driver.read">
      <DriversRegistryPage />
    </PermissionGuard>
  )
}

function DriversRegistryPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("driver.create")
  const canUpdate = hasPermission("driver.update")
  const canDelete = hasPermission("driver.delete")

  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Driver | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")

  const statusItems = STATUS_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
  }))
  const formStatusItems = STATUS_OPTIONS.filter((o) => o.value !== "ALL").map(
    (o) => ({ label: o.label, value: o.value })
  )
  const categoryItems = LICENSE_CATEGORIES.map((c) => ({
    label: c,
    value: c,
  }))

  async function loadDrivers() {
    setLoading(true)
    try {
      const data = await listDrivers({
        limit: 100,
        status: statusFilter,
        search,
      })
      setDrivers(data)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load drivers"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDrivers()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [statusFilter, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(driver: Driver) {
    setEditing(driver)
    setForm({
      first_name: driver.first_name,
      last_name: driver.last_name,
      license_number: driver.license_number,
      license_category: driver.license_category || "LMV",
      license_expiry: driver.license_expiry
        ? driver.license_expiry.slice(0, 10)
        : "",
      contact_number: driver.contact_number || "",
      safety_score: String(driver.safety_score ?? 100),
      trip_completion_pct:
        driver.trip_completion_pct != null
          ? String(driver.trip_completion_pct)
          : "",
      status: (["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].includes(
        driver.status
      )
        ? driver.status
        : "AVAILABLE") as DriverStatus,
    })
    setSheetOpen(true)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        license_number: form.license_number.trim().toUpperCase(),
        license_category: form.license_category,
        license_expiry: form.license_expiry || null,
        contact_number: form.contact_number.trim(),
        safety_score: Number(form.safety_score) || 0,
        trip_completion_pct: form.trip_completion_pct
          ? Number(form.trip_completion_pct)
          : null,
        status: form.status,
      }

      if (editing) {
        await updateDriver(editing.id, payload)
        toast.success("Driver updated")
      } else {
        await createDriver(payload)
        toast.success("Driver added")
      }
      setSheetOpen(false)
      await loadDrivers()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save driver"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusToggle(driver: Driver, status: DriverStatus) {
    if (!canUpdate) return
    try {
      await updateDriver(driver.id, { status })
      toast.success(`Status set to ${STATUS_META[status]?.label ?? status}`)
      await loadDrivers()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update status"
      toast.error(message)
    }
  }

  async function handleDelete(driver: Driver) {
    const confirmed = window.confirm(
      `Delete ${driver.first_name} ${driver.last_name}? Expired or suspended drivers stay blocked from trips.`
    )
    if (!confirmed) return
    try {
      await deleteDriver(driver.id)
      toast.success("Driver deleted")
      await loadDrivers()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to delete driver"
      toast.error(message)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Drivers & Safety Profiles
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage licenses, safety scores, and driver availability.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <PlusIcon />
            Add Driver
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? "ALL")}
          items={statusItems}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, license, contact..."
          className="sm:max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>License No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Trip Compl.</TableHead>
              <TableHead>Safety</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading drivers...
                </TableCell>
              </TableRow>
            ) : drivers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  No drivers found.
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => {
                const status = STATUS_META[driver.status] ?? {
                  label: driver.status,
                  variant: "outline" as const,
                }
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">
                      {driver.first_name} {driver.last_name}
                    </TableCell>
                    <TableCell>{driver.license_number}</TableCell>
                    <TableCell>{driver.license_category}</TableCell>
                    <TableCell>
                      <span
                        className={
                          driver.license_expired
                            ? "font-medium text-destructive"
                            : undefined
                        }
                      >
                        {formatExpiry(driver.license_expiry)}
                        {driver.license_expired ? " EXPIRED" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {driver.contact_number || "—"}
                    </TableCell>
                    <TableCell>
                      {formatTripCompl(driver.trip_completion_pct)}
                    </TableCell>
                    <TableCell>{driver.safety_score}</TableCell>
                    <TableCell>
                      {canUpdate ? (
                        <Select
                          value={
                            ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].includes(
                              driver.status
                            )
                              ? driver.status
                              : "AVAILABLE"
                          }
                          onValueChange={(value) => {
                            if (value) {
                              void handleStatusToggle(
                                driver,
                                value as DriverStatus
                              )
                            }
                          }}
                          items={formStatusItems}
                        >
                          <SelectTrigger size="sm" className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {STATUS_OPTIONS.filter(
                                (o) => o.value !== "ALL"
                              ).map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={status.variant}>{status.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(driver)}
                          >
                            <PencilIcon />
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleDelete(driver)}
                            aria-label={`Delete ${driver.first_name}`}
                          >
                            <Trash2Icon className="text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.filter((o) => o.value !== "ALL").map((option) => (
          <Badge
            key={option.value}
            variant={STATUS_META[option.value]?.variant ?? "outline"}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Edit driver" : "Add driver"}
            </SheetTitle>
            <SheetDescription>
              License number must be unique. Keep expiry and status current for
              dispatch eligibility.
            </SheetDescription>
          </SheetHeader>

          <form
            id="driver-form"
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  required
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  required
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="license_number">License no.</Label>
              <Input
                id="license_number"
                required
                value={form.license_number}
                onChange={(e) => updateField("license_number", e.target.value)}
                placeholder="DL-88213"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="license_category">Category</Label>
                <Select
                  value={form.license_category}
                  onValueChange={(value) =>
                    updateField("license_category", value ?? "LMV")
                  }
                  items={categoryItems}
                >
                  <SelectTrigger id="license_category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {LICENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="license_expiry">Expiry</Label>
                <Input
                  id="license_expiry"
                  type="date"
                  value={form.license_expiry}
                  onChange={(e) =>
                    updateField("license_expiry", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_number">Contact</Label>
              <Input
                id="contact_number"
                value={form.contact_number}
                onChange={(e) => updateField("contact_number", e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="safety_score">Safety score</Label>
                <Input
                  id="safety_score"
                  type="number"
                  min={0}
                  max={100}
                  value={form.safety_score}
                  onChange={(e) => updateField("safety_score", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip_completion_pct">Trip compl. %</Label>
                <Input
                  id="trip_completion_pct"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.trip_completion_pct}
                  onChange={(e) =>
                    updateField("trip_completion_pct", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateField(
                    "status",
                    (value as DriverStatus) ?? "AVAILABLE"
                  )
                }
                items={formStatusItems}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_OPTIONS.filter((o) => o.value !== "ALL").map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="driver-form" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add driver"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
