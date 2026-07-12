"use client"

import * as React from "react"
import { toast } from "sonner"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  createMaintenance,
  listMaintenance,
  listVehicles,
  updateMaintenance,
  type MaintenanceRecord,
  type MaintenanceStatus,
  type Vehicle,
} from "@/lib/api"

const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tire Rotation",
  "Brake Service",
  "Engine Inspection",
  "General",
] as const

const STATUS_OPTIONS: {
  value: MaintenanceStatus | "ALL"
  label: string
}[] = [
  { value: "ALL", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

const STATUS_META: Record<
  MaintenanceStatus,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive" | "success" | "info"
  }
> = {
  SCHEDULED: { label: "Scheduled", variant: "default" },
  IN_PROGRESS: { label: "Ongoing", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

function formatCost(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MaintenancePage() {
  return (
    <PermissionGuard permission="maintenance.read">
      <MaintenanceWorkspace />
    </PermissionGuard>
  )
}

function MaintenanceWorkspace() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("maintenance.create")
  const canUpdate = hasPermission("maintenance.update")

  const [records, setRecords] = React.useState<MaintenanceRecord[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState("ALL")

  const [vehicleId, setVehicleId] = React.useState("")
  const [maintenanceType, setMaintenanceType] = React.useState<string>("Oil Change")
  const [scheduledDate, setScheduledDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  )
  const [cost, setCost] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<MaintenanceStatus>("SCHEDULED")

  const vehicleItems = vehicles.map((v) => ({
    label: `${v.license_plate} · ${v.model}`,
    value: v.id,
  }))
  const typeItems = MAINTENANCE_TYPES.map((t) => ({ label: t, value: t }))
  const formStatusItems = STATUS_OPTIONS.filter((o) => o.value !== "ALL").map(
    (o) => ({ label: o.label, value: o.value })
  )
  const filterItems = STATUS_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
  }))

  async function loadAll() {
    setLoading(true)
    try {
      const [maintenanceData, vehiclesData] = await Promise.all([
        listMaintenance({ limit: 100, status: statusFilter }),
        listVehicles({ limit: 100 }),
      ])
      setRecords(maintenanceData)
      setVehicles(vehiclesData)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to load maintenance"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [statusFilter])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!canCreate) return
    setSaving(true)
    try {
      await createMaintenance({
        vehicle_id: vehicleId,
        maintenance_type: maintenanceType,
        description: description.trim() || maintenanceType,
        scheduled_date: scheduledDate,
        cost: cost ? Number(cost) : null,
        status,
      })
      toast.success("Maintenance logged — vehicle marked In Shop if active")
      setDescription("")
      setCost("")
      setStatus("SCHEDULED")
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to create maintenance"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function setRecordStatus(
    record: MaintenanceRecord,
    next: MaintenanceStatus
  ) {
    if (!canUpdate) return
    try {
      await updateMaintenance(record.id, { status: next })
      toast.success(`Marked ${STATUS_META[next].label}`)
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to update maintenance"
      toast.error(message)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Maintenance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log service work. Active entries put the vehicle In Shop and hide it
          from dispatch.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase">
            Add Maintenance Entry
          </h3>
          <form className="grid gap-4" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-2">
              <Label>Vehicle</Label>
              <Select
                value={vehicleId || undefined}
                onValueChange={(value) => setVehicleId(value ?? "")}
                items={vehicleItems}
                disabled={!canCreate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} · {v.model}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={maintenanceType}
                  onValueChange={(value) =>
                    setMaintenanceType(value ?? "Oil Change")
                  }
                  items={typeItems}
                  disabled={!canCreate}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MAINTENANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  disabled={!canCreate}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="2500"
                  disabled={!canCreate}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus((value as MaintenanceStatus) ?? "SCHEDULED")
                  }
                  items={formStatusItems}
                  disabled={!canCreate}
                >
                  <SelectTrigger className="w-full">
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes for the workshop..."
                disabled={!canCreate}
              />
            </div>

            {canCreate ? (
              <Button type="submit" disabled={saving || !vehicleId}>
                {saving ? "Saving..." : "Submit"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                View-only access — Fleet Managers can create entries.
              </p>
            )}
          </form>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              Maintenance History
            </h3>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "ALL")}
              items={filterItems}
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
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No maintenance records.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const meta = STATUS_META[record.status]
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.vehicle_reg ?? "—"}
                          <div className="text-xs text-muted-foreground">
                            {record.vehicle_model}
                          </div>
                        </TableCell>
                        <TableCell>{record.maintenance_type}</TableCell>
                        <TableCell>{record.scheduled_date}</TableCell>
                        <TableCell>{formatCost(record.cost)}</TableCell>
                        <TableCell>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canUpdate ? (
                            <div className="flex justify-end gap-1">
                              {record.status === "SCHEDULED" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    void setRecordStatus(record, "IN_PROGRESS")
                                  }
                                >
                                  Start
                                </Button>
                              ) : null}
                              {record.status === "SCHEDULED" ||
                              record.status === "IN_PROGRESS" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    void setRecordStatus(record, "COMPLETED")
                                  }
                                >
                                  Complete
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
