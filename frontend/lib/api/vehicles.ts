import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  Vehicle,
  VehicleCreateInput,
  VehicleListParams,
  VehicleUpdateInput,
} from "@/lib/api/types"

function buildQuery(params: VehicleListParams = {}) {
  const query = new URLSearchParams()
  if (params.skip != null) query.set("skip", String(params.skip))
  if (params.limit != null) query.set("limit", String(params.limit))
  if (params.status && params.status !== "ALL") query.set("status", params.status)
  if (params.type && params.type !== "ALL") query.set("type", params.type)
  if (params.search?.trim()) query.set("search", params.search.trim())
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function listVehicles(params: VehicleListParams = {}) {
  const response = await apiRequest<ApiSuccess<Vehicle[]>>(
    `/vehicles${buildQuery(params)}`
  )
  return response.data
}

export async function getVehicle(vehicleId: string) {
  const response = await apiRequest<ApiSuccess<Vehicle>>(
    `/vehicles/${vehicleId}`
  )
  return response.data
}

export async function createVehicle(input: VehicleCreateInput) {
  const response = await apiRequest<ApiSuccess<Vehicle>>("/vehicles", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function updateVehicle(
  vehicleId: string,
  input: VehicleUpdateInput
) {
  const response = await apiRequest<ApiSuccess<Vehicle>>(
    `/vehicles/${vehicleId}`,
    {
      method: "PATCH",
      body: input,
    }
  )
  return response.data
}

export async function deleteVehicle(vehicleId: string) {
  await apiRequest<ApiSuccess<null>>(`/vehicles/${vehicleId}`, {
    method: "DELETE",
  })
}
