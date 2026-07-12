import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  Driver,
  DriverCreateInput,
  DriverListParams,
  DriverUpdateInput,
} from "@/lib/api/types"

function buildQuery(params: DriverListParams = {}) {
  const query = new URLSearchParams()
  if (params.skip != null) query.set("skip", String(params.skip))
  if (params.limit != null) query.set("limit", String(params.limit))
  if (params.status && params.status !== "ALL") query.set("status", params.status)
  if (params.search?.trim()) query.set("search", params.search.trim())
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function listDrivers(params: DriverListParams = {}) {
  const response = await apiRequest<ApiSuccess<Driver[]>>(
    `/drivers${buildQuery(params)}`
  )
  return response.data
}

export async function getDriver(driverId: string) {
  const response = await apiRequest<ApiSuccess<Driver>>(`/drivers/${driverId}`)
  return response.data
}

export async function createDriver(input: DriverCreateInput) {
  const response = await apiRequest<ApiSuccess<Driver>>("/drivers", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function updateDriver(driverId: string, input: DriverUpdateInput) {
  const response = await apiRequest<ApiSuccess<Driver>>(`/drivers/${driverId}`, {
    method: "PATCH",
    body: input,
  })
  return response.data
}

export async function deleteDriver(driverId: string) {
  await apiRequest<ApiSuccess<null>>(`/drivers/${driverId}`, {
    method: "DELETE",
  })
}
