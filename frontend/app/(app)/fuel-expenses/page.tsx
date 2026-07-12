"use client"

import * as React from "react"
import { toast } from "sonner"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/form-field-label"
import { Input } from "@/components/ui/input"
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
  createExpense,
  createFuelLog,
  getOpsCostSummary,
  listExpenses,
  listFuelLogs,
  listMaintenance,
  listTrips,
  listVehicles,
  type Expense,
  type FuelLog,
  type MaintenanceRecord,
  type OpsCostSummary,
  type Trip,
  type Vehicle,
} from "@/lib/api"

function formatINR(value: number | null | undefined) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function tripCode(trip: Trip, index: number) {
  return `TR${String(index + 1).padStart(3, "0")}`
}

type TripExpenseRow = {
  key: string
  tripCode: string
  tripLabel: string
  vehicleLabel: string
  toll: number
  other: number
  maint: number
  total: number
  statusLabel: string
  statusVariant: "default" | "secondary" | "outline" | "success" | "info"
}

function buildTripExpenseRows(
  expenses: Expense[],
  trips: Trip[],
  maintenance: MaintenanceRecord[]
): TripExpenseRow[] {
  const tripById = new Map(trips.map((t) => [t.id, t]))
  const tripIndex = new Map(trips.map((t, i) => [t.id, i]))

  const groups = new Map<
    string,
    {
      tripId: string | null
      vehicleId: string | null
      vehicleLabel: string
      tripLabel: string
      toll: number
      other: number
      maint: number
    }
  >()

  for (const expense of expenses) {
    if (
      expense.expense_type !== "TOLL" &&
      expense.expense_type !== "OTHER" &&
      expense.expense_type !== "MAINTENANCE"
    ) {
      continue
    }
    const key = expense.trip_id ?? `orphan-${expense.id}`
    const trip = expense.trip_id ? tripById.get(expense.trip_id) : undefined
    const existing = groups.get(key) ?? {
      tripId: expense.trip_id,
      vehicleId: expense.vehicle_id ?? trip?.vehicle_id ?? null,
      vehicleLabel:
        expense.vehicle_model ||
        expense.vehicle_reg ||
        trip?.vehicle_model ||
        trip?.vehicle_reg ||
        "—",
      tripLabel: expense.trip_label || (trip ? `${trip.origin} → ${trip.destination}` : "—"),
      toll: 0,
      other: 0,
      maint: 0,
    }
    if (expense.expense_type === "TOLL") existing.toll += expense.amount
    if (expense.expense_type === "OTHER") existing.other += expense.amount
    if (expense.expense_type === "MAINTENANCE") existing.maint += expense.amount
    groups.set(key, existing)
  }

  // Link completed maintenance costs to trips sharing the same vehicle when no MAINTENANCE expense exists
  for (const group of groups.values()) {
    if (group.maint > 0 || !group.vehicleId) continue
    const linked = maintenance
      .filter(
        (m) =>
          m.vehicle_id === group.vehicleId &&
          (m.status === "COMPLETED" || m.status === "IN_PROGRESS")
      )
      .reduce((sum, m) => sum + (m.cost ?? 0), 0)
    group.maint = linked
  }

  return Array.from(groups.entries()).map(([key, g]) => {
    const trip = g.tripId ? tripById.get(g.tripId) : undefined
    const idx = g.tripId != null ? (tripIndex.get(g.tripId) ?? 0) : 0
    const completed = trip?.status === "COMPLETED"
    return {
      key,
      tripCode: trip ? tripCode(trip, idx) : "—",
      tripLabel: g.tripLabel,
      vehicleLabel: g.vehicleLabel,
      toll: g.toll,
      other: g.other,
      maint: g.maint,
      total: g.toll + g.other + g.maint,
      statusLabel: completed ? "Completed" : "Available",
      statusVariant: completed ? "success" : "default",
    }
  })
}

export default function FuelExpensesPage() {
  return (
    <PermissionGuard anyOf={["fuel.read", "expense.read"]}>
      <FuelExpensesWorkspace />
    </PermissionGuard>
  )
}

function FuelExpensesWorkspace() {
  const { hasPermission } = useAuth()
  const canLogFuel = hasPermission("fuel.create")
  const canAddExpense = hasPermission("expense.create")
  const canReadFuel = hasPermission("fuel.read")
  const canReadExpense = hasPermission("expense.read")

  const [fuelLogs, setFuelLogs] = React.useState<FuelLog[]>([])
  const [expenses, setExpenses] = React.useState<Expense[]>([])
  const [trips, setTrips] = React.useState<Trip[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [maintenance, setMaintenance] = React.useState<MaintenanceRecord[]>([])
  const [opsCost, setOpsCost] = React.useState<OpsCostSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [fuelOpen, setFuelOpen] = React.useState(false)
  const [expenseOpen, setExpenseOpen] = React.useState(false)

  const [fuelForm, setFuelForm] = React.useState({
    vehicle_id: "",
    liters: "",
    cost: "",
    date_filled: new Date().toISOString().slice(0, 10),
  })
  const [expenseForm, setExpenseForm] = React.useState({
    trip_id: "",
    vehicle_id: "",
    expense_type: "TOLL",
    amount: "",
    date_incurred: new Date().toISOString().slice(0, 10),
    description: "",
  })

  const vehicleItems = vehicles.map((v) => ({
    label: `${v.model} · ${v.license_plate}`,
    value: v.id,
  }))
  const tripItems = trips.map((t, i) => ({
    label: `${tripCode(t, i)} · ${t.origin} → ${t.destination}`,
    value: t.id,
  }))

  const tripRows = buildTripExpenseRows(expenses, trips, maintenance)

  async function loadAll() {
    setLoading(true)
    try {
      const [fuel, exp, tripList, vehicleList, maint, summary] =
        await Promise.all([
          canReadFuel ? listFuelLogs(100) : Promise.resolve([]),
          canReadExpense ? listExpenses(100) : Promise.resolve([]),
          listTrips({ limit: 100 }).catch(() => []),
          listVehicles({ limit: 100 }).catch(() => []),
          listMaintenance({ limit: 100 }).catch(() => []),
          canReadFuel
            ? getOpsCostSummary().catch(() => null)
            : Promise.resolve(null),
        ])
      setFuelLogs(fuel)
      setExpenses(exp)
      setTrips(tripList)
      setVehicles(vehicleList)
      setMaintenance(maint)
      setOpsCost(summary)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load finance data"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogFuel(event: React.FormEvent) {
    event.preventDefault()
    if (!fuelForm.vehicle_id || !fuelForm.liters || !fuelForm.cost) {
      toast.error("Vehicle, liters, and cost are required")
      return
    }
    setSaving(true)
    try {
      await createFuelLog({
        vehicle_id: fuelForm.vehicle_id,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        date_filled: fuelForm.date_filled,
      })
      toast.success("Fuel log saved")
      setFuelOpen(false)
      setFuelForm({
        vehicle_id: "",
        liters: "",
        cost: "",
        date_filled: new Date().toISOString().slice(0, 10),
      })
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to log fuel"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddExpense(event: React.FormEvent) {
    event.preventDefault()
    if (!expenseForm.amount) {
      toast.error("Amount is required")
      return
    }
    const trip = trips.find((t) => t.id === expenseForm.trip_id)
    const vehicleId = expenseForm.vehicle_id || trip?.vehicle_id || null
    setSaving(true)
    try {
      await createExpense({
        trip_id: expenseForm.trip_id || null,
        vehicle_id: vehicleId,
        expense_type: expenseForm.expense_type,
        amount: Number(expenseForm.amount),
        date_incurred: expenseForm.date_incurred,
        description: expenseForm.description || null,
      })
      toast.success("Expense added")
      setExpenseOpen(false)
      setExpenseForm({
        trip_id: "",
        vehicle_id: "",
        expense_type: "TOLL",
        amount: "",
        date_incurred: new Date().toISOString().slice(0, 10),
        description: "",
      })
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to add expense"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fuel & Expense Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Log fuel fills and trip expenses. Ops cost auto-sums fuel + maintenance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canLogFuel ? (
            <Button onClick={() => setFuelOpen(true)}>+ Log Fuel</Button>
          ) : null}
          {canAddExpense ? (
            <Button variant="secondary" onClick={() => setExpenseOpen(true)}>
              + Add Expense
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {canReadFuel ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Fuel Logs
              </h2>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead className="text-right">Fuel Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No fuel logs yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fuelLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.vehicle_model || log.vehicle_reg || "—"}
                          </TableCell>
                          <TableCell>{formatDate(log.date_filled)}</TableCell>
                          <TableCell>{log.liters} L</TableCell>
                          <TableCell className="text-right">
                            {formatINR(log.cost)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          {canReadExpense ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Other Expenses (Toll / Misc)
              </h2>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Toll</TableHead>
                      <TableHead className="text-right">Other</TableHead>
                      <TableHead className="text-right">Maint. (Linked)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tripRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No trip expenses yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tripRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell>
                            <div className="font-medium">{row.tripCode}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.tripLabel}
                            </div>
                          </TableCell>
                          <TableCell>{row.vehicleLabel}</TableCell>
                          <TableCell className="text-right">
                            {formatINR(row.toll)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatINR(row.other)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatINR(row.maint)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span>{formatINR(row.total)}</span>
                              <Badge variant={row.statusVariant}>
                                {row.statusLabel}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          {opsCost ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Total Operational Cost (Auto) = Fuel + Maint
              </p>
              <p className="text-2xl font-semibold text-orange-600">
                {formatINR(opsCost.total_operational_cost)}
              </p>
            </div>
          ) : null}
        </>
      )}

      <Sheet open={fuelOpen} onOpenChange={setFuelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Log Fuel</SheetTitle>
            <SheetDescription>
              Record a fuel fill against a vehicle.
            </SheetDescription>
          </SheetHeader>
          <form
            id="fuel-form"
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
            onSubmit={(event) => void handleLogFuel(event)}
          >
            <div className="grid gap-2">
              <FieldLabel>Vehicle</FieldLabel>
              <Select
                value={fuelForm.vehicle_id}
                onValueChange={(value) =>
                  setFuelForm((f) => ({ ...f, vehicle_id: value ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {vehicleItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="date_filled">Date</FieldLabel>
              <Input
                id="date_filled"
                type="date"
                required
                value={fuelForm.date_filled}
                onChange={(e) =>
                  setFuelForm((f) => ({ ...f, date_filled: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="liters">Liters</FieldLabel>
                <Input
                  id="liters"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={fuelForm.liters}
                  onChange={(e) =>
                    setFuelForm((f) => ({ ...f, liters: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="fuel_cost">Fuel cost</FieldLabel>
                <Input
                  id="fuel_cost"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={fuelForm.cost}
                  onChange={(e) =>
                    setFuelForm((f) => ({ ...f, cost: e.target.value }))
                  }
                />
              </div>
            </div>
          </form>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFuelOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="fuel-form" disabled={saving}>
              {saving ? "Saving…" : "Save fuel log"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={expenseOpen} onOpenChange={setExpenseOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Expense</SheetTitle>
            <SheetDescription>
              Toll or misc cost, optionally linked to a trip.
            </SheetDescription>
          </SheetHeader>
          <form
            id="expense-form"
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
            onSubmit={(event) => void handleAddExpense(event)}
          >
            <div className="grid gap-2">
              <FieldLabel tooltip="Linking a trip can auto-fill the vehicle for this expense.">
                Trip (optional)
              </FieldLabel>
              <Select
                value={expenseForm.trip_id || undefined}
                onValueChange={(value) => {
                  const trip = trips.find((t) => t.id === value)
                  setExpenseForm((f) => ({
                    ...f,
                    trip_id: value ?? "",
                    vehicle_id: trip?.vehicle_id ?? f.vehicle_id,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tripItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Vehicle</FieldLabel>
              <Select
                value={expenseForm.vehicle_id}
                onValueChange={(value) =>
                  setExpenseForm((f) => ({ ...f, vehicle_id: value ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {vehicleItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel tooltip="Toll / Other for trip costs. Maintenance (linked) ties a shop charge to the trip.">
                Type
              </FieldLabel>
              <Select
                value={expenseForm.expense_type}
                onValueChange={(value) =>
                  setExpenseForm((f) => ({
                    ...f,
                    expense_type: value ?? "TOLL",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="TOLL">Toll</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance (linked)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="amount">Amount</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="date_incurred">Date</FieldLabel>
                <Input
                  id="date_incurred"
                  type="date"
                  required
                  value={expenseForm.date_incurred}
                  onChange={(e) =>
                    setExpenseForm((f) => ({
                      ...f,
                      date_incurred: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="description">Notes</FieldLabel>
              <Input
                id="description"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>
          </form>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="expense-form" disabled={saving}>
              {saving ? "Saving…" : "Save expense"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
