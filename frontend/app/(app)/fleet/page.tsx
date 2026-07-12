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
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
  type Vehicle,
  type VehicleStatus,
} from "@/lib/api"

const VEHICLE_TYPES = ["Van", "Truck", "Mini"] as const

const STATUS_OPTIONS: {
  value: VehicleStatus | "ALL"
  label: string
}[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Available" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "MAINTENANCE", label: "In Shop" },
  { value: "INACTIVE", label: "Retired" },
]

const STATUS_META: Record<
  VehicleStatus,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive" | "success" | "info"
  }
> = {
  ACTIVE: { label: "Available", variant: "default" },
  ON_TRIP: { label: "On Trip", variant: "info" },
  MAINTENANCE: { label: "In Shop", variant: "outline" },
  INACTIVE: { label: "Retired", variant: "destructive" },
}

type FormState = {
  vin: string
  license_plate: string
  make: string
  model: string
  year: string
  vehicle_type: string
  capacity: string
  odometer: string
  acquisition_cost: string
  status: VehicleStatus
}

const emptyForm: FormState = {
  vin: "",
  license_plate: "",
  make: "",
  model: "",
  year: new Date().getFullYear().toString(),
  vehicle_type: "Van",
  capacity: "",
  odometer: "0",
  acquisition_cost: "0",
  status: "ACTIVE",
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

function formatOdometer(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

export default function FleetPage() {
  return (
    <PermissionGuard permission="vehicle.read">
      <FleetRegistryPage />
    </PermissionGuard>
  )
}

function FleetRegistryPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("vehicle.create")
  const canUpdate = hasPermission("vehicle.update")
  const canDelete = hasPermission("vehicle.delete")
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Vehicle | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")

  const typeItems = [
    { label: "All", value: "ALL" },
    ...VEHICLE_TYPES.map((type) => ({ label: type, value: type })),
  ]
  const statusItems = STATUS_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  }))
  const formStatusItems = STATUS_OPTIONS.filter(
    (option) => option.value !== "ALL"
  ).map((option) => ({
    label: option.label,
    value: option.value,
  }))
  const formTypeItems = VEHICLE_TYPES.map((type) => ({
    label: type,
    value: type,
  }))

  async function loadVehicles() {
    setLoading(true)
    try {
      const data = await listVehicles({
        limit: 100,
        type: typeFilter,
        status: statusFilter,
        search,
      })
      setVehicles(data)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load vehicles"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVehicles()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [typeFilter, statusFilter, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle)
    setForm({
      vin: vehicle.vin,
      license_plate: vehicle.license_plate,
      make: vehicle.make,
      model: vehicle.model,
      year: String(vehicle.year),
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity,
      odometer: String(vehicle.odometer),
      acquisition_cost: String(vehicle.acquisition_cost),
      status: vehicle.status,
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
        vin: form.vin.trim(),
        license_plate: form.license_plate.trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        vehicle_type: form.vehicle_type,
        capacity: form.capacity.trim(),
        odometer: Number(form.odometer) || 0,
        acquisition_cost: Number(form.acquisition_cost) || 0,
        status: form.status,
      }

      if (editing) {
        await updateVehicle(editing.id, payload)
        toast.success("Vehicle updated")
      } else {
        await createVehicle(payload)
        toast.success("Vehicle added")
      }
      setSheetOpen(false)
      await loadVehicles()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save vehicle"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `Delete ${vehicle.license_plate}? Registration numbers must stay unique.`
    )
    if (!confirmed) return
    try {
      await deleteVehicle(vehicle.id)
      toast.success("Vehicle deleted")
      await loadVehicles()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to delete vehicle"
      toast.error(message)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Vehicle Registry
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track registration, capacity, odometer, and fleet status.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <PlusIcon />
            Add Vehicle
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value ?? "ALL")}
          items={typeItems}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All</SelectItem>
              {VEHICLE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

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
          placeholder="Search reg. no..."
          className="sm:max-w-xs"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg. No.</TableHead>
              <TableHead>Name / Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Odometer</TableHead>
              <TableHead>Acq. Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading fleet...
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No vehicles found.
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => {
                const status = STATUS_META[vehicle.status] ?? {
                  label: vehicle.status,
                  variant: "outline" as const,
                }
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.license_plate}
                    </TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.vehicle_type}</TableCell>
                    <TableCell>{vehicle.capacity || "—"}</TableCell>
                    <TableCell>{formatOdometer(vehicle.odometer)}</TableCell>
                    <TableCell>
                      {formatCost(Number(vehicle.acquisition_cost))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(vehicle)}
                          >
                            <PencilIcon />
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleDelete(vehicle)}
                            aria-label={`Delete ${vehicle.license_plate}`}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Edit vehicle" : "Add vehicle"}
            </SheetTitle>
            <SheetDescription>
              Registration number must be unique across the fleet.
            </SheetDescription>
          </SheetHeader>

          <form
            id="vehicle-form"
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="grid gap-2">
              <Label htmlFor="license_plate">Registration no.</Label>
              <Input
                id="license_plate"
                required
                value={form.license_plate}
                onChange={(e) => updateField("license_plate", e.target.value)}
                placeholder="GJ01AB452"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Name / Model</Label>
              <Input
                id="model"
                required
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="VAN-05"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                required
                value={form.make}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="Tata"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                required
                value={form.vin}
                onChange={(e) => updateField("vin", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => updateField("year", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicle_type">Type</Label>
                <Select
                  value={form.vehicle_type}
                  onValueChange={(value) =>
                    updateField("vehicle_type", value ?? "Van")
                  }
                  items={formTypeItems}
                >
                  <SelectTrigger id="vehicle_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                value={form.capacity}
                onChange={(e) => updateField("capacity", e.target.value)}
                placeholder="500 kg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="odometer">Odometer</Label>
                <Input
                  id="odometer"
                  type="number"
                  min={0}
                  value={form.odometer}
                  onChange={(e) => updateField("odometer", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="acquisition_cost">Acq. cost</Label>
                <Input
                  id="acquisition_cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.acquisition_cost}
                  onChange={(e) =>
                    updateField("acquisition_cost", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateField("status", (value as VehicleStatus) ?? "ACTIVE")
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
            <Button type="submit" form="vehicle-form" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add vehicle"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
