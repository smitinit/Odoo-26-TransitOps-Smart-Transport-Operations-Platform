import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  Trip,
  TripCreateInput,
  TripListParams,
  TripUpdateInput,
} from "@/lib/api/types"

function buildQuery(params: TripListParams = {}) {
  const query = new URLSearchParams()
  if (params.skip != null) query.set("skip", String(params.skip))
  if (params.limit != null) query.set("limit", String(params.limit))
  if (params.status && params.status !== "ALL") query.set("status", params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function listTrips(params: TripListParams = {}) {
  const response = await apiRequest<ApiSuccess<Trip[]>>(
    `/trips${buildQuery(params)}`
  )
  return response.data
}

export async function createTrip(input: TripCreateInput) {
  const response = await apiRequest<ApiSuccess<Trip>>("/trips", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function updateTrip(tripId: string, input: TripUpdateInput) {
  const response = await apiRequest<ApiSuccess<Trip>>(`/trips/${tripId}`, {
    method: "PATCH",
    body: input,
  })
  return response.data
}

export async function deleteTrip(tripId: string) {
  await apiRequest<ApiSuccess<null>>(`/trips/${tripId}`, {
    method: "DELETE",
  })
}
