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
  ApiError,
  createTrip,
  listDrivers,
  listTrips,
  listVehicles,
  updateTrip,
  type Driver,
  type Trip,
  type TripStatus,
  type Vehicle,
} from "@/lib/api"

const STATUS_META: Record<
  TripStatus,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive" | "success" | "info"
  }
> = {
  PLANNED: { label: "Scheduled", variant: "outline" },
  IN_PROGRESS: { label: "In Transit", variant: "info" },
  COMPLETED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

const STEPPER = [
  "Trip Created",
  "Driver Assigned",
  "In Transit",
  "Delivered",
] as const

function capacityToKg(capacity: string | null | undefined): number {
  if (!capacity) return 0
  const match = capacity.trim().match(/^([\d.]+)\s*(kg|kgs|ton|tons|t)?$/i)
  if (!match) return 0
  const value = Number(match[1])
  const unit = (match[2] || "kg").toLowerCase()
  if (unit === "ton" || unit === "tons" || unit === "t") return value * 1000
  return value
}

function stepperIndex(status: TripStatus | null, hasAssignment: boolean): number {
  if (!status) return hasAssignment ? 1 : 0
  if (status === "PLANNED") return hasAssignment ? 1 : 0
  if (status === "IN_PROGRESS") return 2
  if (status === "COMPLETED") return 3
  return 1
}

function toLocalInputValue(iso?: string) {
  if (!iso) {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function TripsPage() {
  return (
    <PermissionGuard permission="trip.read">
      <TripDispatcherPage />
    </PermissionGuard>
  )
}

function TripDispatcherPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("trip.create")
  const canDispatch = hasPermission("trip.dispatch")
  const canComplete = hasPermission("trip.complete")
  const canCancel = hasPermission("trip.cancel")

  const [trips, setTrips] = React.useState<Trip[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [vehicleId, setVehicleId] = React.useState("")
  const [driverId, setDriverId] = React.useState("")
  const [loadType, setLoadType] = React.useState("")
  const [cargoWeight, setCargoWeight] = React.useState("0")
  const [distance, setDistance] = React.useState("")
  const [startTime, setStartTime] = React.useState(toLocalInputValue())
  const [endTime, setEndTime] = React.useState("")

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId)
  const cargoKg = Number(cargoWeight) || 0
  const capacityKg = capacityToKg(selectedVehicle?.capacity)
  const capacityWarning =
    selectedVehicle && capacityKg > 0 && cargoKg > capacityKg
      ? `Warning: Cargo weight (${cargoKg} kg) exceeds vehicle capacity (${selectedVehicle.capacity}). Select a higher-capacity vehicle.`
      : null

  const dispatchableVehicles = vehicles.filter((v) => v.status === "ACTIVE")
  const dispatchableDrivers = drivers.filter(
    (d) =>
      (d.status === "AVAILABLE" || d.status === "ACTIVE") && !d.license_expired
  )

  const vehicleItems = dispatchableVehicles.map((v) => ({
    label: `${v.license_plate} · ${v.model} (${v.capacity})`,
    value: v.id,
  }))
  const driverItems = dispatchableDrivers.map((d) => ({
    label: `${d.first_name} ${d.last_name} · ${d.license_number}`,
    value: d.id,
  }))

  async function loadAll() {
    setLoading(true)
    try {
      const [tripsData, vehiclesData, driversData] = await Promise.all([
        listTrips({ limit: 100 }),
        listVehicles({ limit: 100 }),
        listDrivers({ limit: 100 }),
      ])
      setTrips(tripsData)
      setVehicles(vehiclesData)
      setDrivers(driversData)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load trips"
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
  }, [])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!canCreate) return
    if (capacityWarning) {
      toast.error(capacityWarning)
      return
    }
    setSaving(true)
    try {
      await createTrip({
        origin: origin.trim(),
        destination: destination.trim(),
        vehicle_id: vehicleId,
        driver_id: driverId,
        load_type: loadType.trim(),
        cargo_weight_kg: cargoKg,
        planned_distance_km: distance ? Number(distance) : null,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        status: "PLANNED",
      })
      toast.success("Trip created")
      setOrigin("")
      setDestination("")
      setVehicleId("")
      setDriverId("")
      setLoadType("")
      setCargoWeight("0")
      setDistance("")
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to create trip"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(trip: Trip, status: TripStatus) {
    try {
      await updateTrip(trip.id, { status })
      toast.success(`Trip marked ${STATUS_META[status].label}`)
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update trip"
      toast.error(message)
    }
  }

  const activeStep = stepperIndex(
    null,
    Boolean(vehicleId && driverId)
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Trip Dispatcher</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create trips, assign available vehicles and drivers, and track status.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        {STEPPER.map((label, index) => (
          <React.Fragment key={label}>
            <div
              className={
                index <= activeStep
                  ? "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {label}
            </div>
            {index < STEPPER.length - 1 ? (
              <span className="text-muted-foreground">→</span>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase">
            New Trip
          </h3>
          <form className="grid gap-4" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="origin">Origin</Label>
                <Input
                  id="origin"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Mumbai"
                  disabled={!canCreate}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Pune"
                  disabled={!canCreate}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Vehicle</Label>
              <Select
                value={vehicleId || undefined}
                onValueChange={(value) => setVehicleId(value ?? "")}
                items={vehicleItems}
                disabled={!canCreate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select available vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {dispatchableVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} · {v.model} ({v.capacity})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Driver</Label>
              <Select
                value={driverId || undefined}
                onValueChange={(value) => setDriverId(value ?? "")}
                items={driverItems}
                disabled={!canCreate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select available driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {dispatchableDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name} · {d.license_number}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="load_type">Load type</Label>
                <Input
                  id="load_type"
                  value={loadType}
                  onChange={(e) => setLoadType(e.target.value)}
                  placeholder="Parcels"
                  disabled={!canCreate}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cargo">Cargo weight (kg)</Label>
                <Input
                  id="cargo"
                  type="number"
                  min={0}
                  step="0.1"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  disabled={!canCreate}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="distance">Distance (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  min={0}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  disabled={!canCreate}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start">Expected start</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!canCreate}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Expected end</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canCreate}
                />
              </div>
            </div>

            {capacityWarning ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {capacityWarning}
              </div>
            ) : null}

            {canCreate ? (
              <Button type="submit" disabled={saving || Boolean(capacityWarning)}>
                {saving ? "Creating..." : "Create Trip"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have view-only access to trips.
              </p>
            )}
          </form>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase">
            Current Trips
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading trips...</p>
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trips yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {trips.map((trip) => {
                const meta = STATUS_META[trip.status]
                const step = stepperIndex(trip.status, true)
                return (
                  <div
                    key={trip.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {trip.origin} → {trip.destination}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {trip.vehicle_reg ?? "Vehicle"} ·{" "}
                          {trip.driver_name ?? "Driver"} ·{" "}
                          {trip.cargo_weight_kg} kg
                          {trip.load_type ? ` · ${trip.load_type}` : ""}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {STEPPER.map((label, i) => (
                            <span
                              key={label}
                              className={
                                i <= step ? "text-foreground" : undefined
                              }
                            >
                              {label}
                              {i < STEPPER.length - 1 ? " → " : ""}
                            </span>
                          ))}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canDispatch && trip.status === "PLANNED" ? (
                        <Button
                          size="sm"
                          onClick={() => void setStatus(trip, "IN_PROGRESS")}
                        >
                          Dispatch
                        </Button>
                      ) : null}
                      {(canComplete || canDispatch) &&
                      trip.status === "IN_PROGRESS" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void setStatus(trip, "COMPLETED")}
                        >
                          Complete
                        </Button>
                      ) : null}
                      {canCancel &&
                      (trip.status === "PLANNED" ||
                        trip.status === "IN_PROGRESS") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void setStatus(trip, "CANCELLED")}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
