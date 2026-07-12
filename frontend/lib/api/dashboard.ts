import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  DashboardOverview,
  DashboardOverviewParams,
} from "@/lib/api/types"

function buildQuery(params: DashboardOverviewParams = {}) {
  const query = new URLSearchParams()
  if (params.vehicle_type && params.vehicle_type !== "ALL") {
    query.set("vehicle_type", params.vehicle_type)
  }
  if (params.status && params.status !== "ALL") {
    query.set("status", params.status)
  }
  if (params.region && params.region !== "ALL") {
    query.set("region", params.region)
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function getDashboardOverview(params: DashboardOverviewParams = {}) {
  const response = await apiRequest<ApiSuccess<DashboardOverview>>(
    `/dashboard/overview${buildQuery(params)}`
  )
  return response.data
}
