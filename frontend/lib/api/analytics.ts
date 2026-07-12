import { apiRequest } from "@/lib/api/client"
import type {
  AnalyticsOverview,
  AnalyticsOverviewParams,
  ApiSuccess,
} from "@/lib/api/types"

function buildQuery(params: AnalyticsOverviewParams = {}) {
  const query = new URLSearchParams()
  if (params.vehicle_id && params.vehicle_id !== "ALL") {
    query.set("vehicle_id", params.vehicle_id)
  }
  if (params.vehicle_type && params.vehicle_type !== "ALL") {
    query.set("vehicle_type", params.vehicle_type)
  }
  if (params.region && params.region !== "ALL") {
    query.set("region", params.region)
  }
  if (params.date_from) query.set("date_from", params.date_from)
  if (params.date_to) query.set("date_to", params.date_to)
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function getAnalyticsOverview(
  params: AnalyticsOverviewParams = {}
) {
  const response = await apiRequest<ApiSuccess<AnalyticsOverview>>(
    `/analytics/overview${buildQuery(params)}`
  )
  return response.data
}
