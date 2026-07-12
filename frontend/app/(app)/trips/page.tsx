"use client"

import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { useAuth } from "@/components/auth/auth-provider"
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
import { cn } from "@/lib/utils"

const LIFECYCLE = [
  { key: "draft", label: "Draft", color: "bg-emerald-500 border-emerald-500" },
  { key: "dispatched", label: "Dispatched", color: "bg-sky-500 border-sky-500" },
  { key: "transit", label: "In Transit", color: "bg-violet-500 border-violet-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-600 border-emerald-600" },
] as const

const STATUS_UI: Record<
  TripStatus,
  {
    label: string
    badge: string
    hoverBg: string
  }
> = {
  PLANNED: {
    label: "Draft",
    badge: "bg-zinc-500 text-white",
    hoverBg: "hover:bg-zinc-600 dark:hover:bg-zinc-500",
  },
  IN_PROGRESS: {
    label: "Dispatched",
    badge: "bg-sky-500 text-white",
    hoverBg: "hover:bg-sky-600 dark:hover:bg-sky-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-emerald-500 text-white",
    hoverBg: "hover:bg-emerald-600 dark:hover:bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-rose-500 text-white",
    hoverBg: "hover:bg-rose-600 dark:hover:bg-rose-500",
  },
}

function capacityToKg(capacity: string | null | undefined): number {
  if (!capacity) return 0
  const match = capacity.trim().match(/^([\d.]+)\s*(kg|kgs|ton|tons|t)?$/i)
  if (!match) return 0
  const value = Number(match[1])
  const unit = (match[2] || "kg").toLowerCase()
  if (unit === "ton" || unit === "tons" || unit === "t") return value * 1000
  return value
}

function formLifecycleStep(hasAssignment: boolean): number {
  return hasAssignment ? 1 : 0
}

function tripCode(id: string) {
  return `TR${id.replace(/-/g, "").slice(0, 3).toUpperCase()}`
}

function relativeEta(trip: Trip): string {
  if (trip.status === "CANCELLED") return "—"
  if (trip.status === "COMPLETED") return "Done"
  if (trip.status === "PLANNED") {
    return trip.driver_id ? "Awaiting dispatch" : "Awaiting driver"
  }
  if (!trip.end_time) return "In progress"
  const ms = new Date(trip.end_time).getTime() - Date.now()
  if (ms <= 0) return "Due now"
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hours}h ${rem}m` : `${hours}h`
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

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase"
    >
      {children}
    </Label>
  )
}

function LifecycleTrack({ activeStep }: { activeStep: number }) {
  return (
    <div className="mb-6 px-1">
      <div className="flex items-center justify-between">
        {LIFECYCLE.map((step, index) => {
          const reached = index <= activeStep
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    reached
                      ? step.color
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {reached ? (
                    <CheckIcon className="size-2 text-white" strokeWidth={3} />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-wide uppercase",
                    reached ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < LIFECYCLE.length - 1 ? (
                <div
                  className={cn(
                    "mb-5 h-px flex-1 mx-2 transition-colors duration-300",
                    index < activeStep
                      ? "bg-foreground/40"
                      : "bg-border"
                  )}
                />
              ) : null}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
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
  const overflowKg =
    selectedVehicle && capacityKg > 0 && cargoKg > capacityKg
      ? Math.round((cargoKg - capacityKg) * 10) / 10
      : 0
  const capacityWarning =
    overflowKg > 0
      ? `Capacity exceeded by ${overflowKg} kg`
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

  const formReady =
    Boolean(origin.trim() && destination.trim() && vehicleId && driverId) &&
    !capacityWarning

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

  function resetForm() {
    setOrigin("")
    setDestination("")
    setVehicleId("")
    setDriverId("")
    setLoadType("")
    setCargoWeight("0")
    setDistance("")
    setStartTime(toLocalInputValue())
    setEndTime("")
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!canCreate || !formReady) return
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
      resetForm()
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
      toast.success(`Trip marked ${STATUS_UI[status].label}`)
      await loadAll()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update trip"
      toast.error(message)
    }
  }

  const activeStep = formLifecycleStep(Boolean(vehicleId && driverId))

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Trip Dispatcher</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft trips, assign fleet, and track the live board.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        {/* Create Trip */}
        <section className="rounded-2xl border bg-card p-6">
          <h3 className="mb-5 text-sm font-semibold tracking-tight">Create Trip</h3>

          <LifecycleTrack activeStep={activeStep} />

          <form className="grid gap-4" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="origin">Origin</FieldLabel>
                <Input
                  id="origin"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Gandhinagar Depot"
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="destination">Destination</FieldLabel>
                <Input
                  id="destination"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ahmedabad Hub"
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel>Vehicle</FieldLabel>
                <Select
                  value={vehicleId || undefined}
                  onValueChange={(value) => setVehicleId(value ?? "")}
                  items={vehicleItems}
                  disabled={!canCreate}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Select vehicle" />
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
                <FieldLabel>Driver</FieldLabel>
                <Select
                  value={driverId || undefined}
                  onValueChange={(value) => setDriverId(value ?? "")}
                  items={driverItems}
                  disabled={!canCreate}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {dispatchableDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="load_type">Load type</FieldLabel>
                <Input
                  id="load_type"
                  value={loadType}
                  onChange={(e) => setLoadType(e.target.value)}
                  placeholder="Parcels"
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="cargo">Cargo weight (kg)</FieldLabel>
                <Input
                  id="cargo"
                  type="number"
                  min={0}
                  step="0.1"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="distance">Distance (km)</FieldLabel>
                <Input
                  id="distance"
                  type="number"
                  min={0}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="start">Expected start</FieldLabel>
                <Input
                  id="start"
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="end">Expected end</FieldLabel>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canCreate}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {capacityWarning ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">
                <XIcon className="mt-0.5 size-4 shrink-0" />
                <span>{capacityWarning}</span>
              </div>
            ) : null}

            {canCreate ? (
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="lg"
                  className="h-10 min-w-[140px] rounded-xl"
                  disabled={saving || !formReady}
                >
                  {saving ? "Creating..." : "Create Trip"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className="h-10 rounded-xl text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have view-only access to trips.
              </p>
            )}
          </form>
        </section>

        {/* Live Board */}
        <section className="rounded-2xl border bg-card p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight">Live Board</h3>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${trips.length} trips`}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading board...</p>
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trips on the board yet.</p>
          ) : (
            <div className="flex max-h-[min(72vh,760px)] flex-col gap-3 overflow-y-auto pr-1">
              {trips.map((trip) => {
                const ui = STATUS_UI[trip.status]
                const vehicleLabel = (
                  trip.vehicle_reg ?? "VEH"
                ).toUpperCase()
                const driverLabel = (trip.driver_name ?? "—")
                  .split(" ")[0]
                  ?.toUpperCase()
                return (
                  <article
                    key={trip.id}
                    className={cn(
                      "group rounded-xl border border-dashed border-border/80 bg-background/50 p-4",
                      "transition-[background-color,border-color,color] duration-300 ease-in-out",
                      "hover:border-transparent hover:text-white",
                      ui.hoverBg
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors duration-300 group-hover:text-white/80">
                        {tripCode(trip.id)}
                      </span>
                      <span className="truncate text-right text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors duration-300 group-hover:text-white/85">
                        {vehicleLabel} / {driverLabel}
                      </span>
                    </div>

                    <p className="mt-2.5 text-base font-medium tracking-tight capitalize transition-colors duration-300 group-hover:text-white">
                      {trip.origin}
                      <span className="mx-1.5 text-muted-foreground group-hover:text-white/70">
                        →
                      </span>
                      {trip.destination}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-semibold tracking-wide",
                          ui.badge,
                          "transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white"
                        )}
                      >
                        {ui.label}
                      </span>
                      <span className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-white/80">
                        {relativeEta(trip)}
                      </span>
                    </div>

                    {(canDispatch || canComplete || canCancel) &&
                    (trip.status === "PLANNED" ||
                      trip.status === "IN_PROGRESS") ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3 transition-colors duration-300 group-hover:border-white/20">
                        {canDispatch && trip.status === "PLANNED" ? (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg group-hover:bg-white group-hover:text-foreground"
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
                            className="h-8 rounded-lg group-hover:bg-white/90 group-hover:text-foreground"
                            onClick={() => void setStatus(trip, "COMPLETED")}
                          >
                            Complete
                          </Button>
                        ) : null}
                        {canCancel ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 group-hover:text-white group-hover:hover:bg-white/10"
                            onClick={() => void setStatus(trip, "CANCELLED")}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
