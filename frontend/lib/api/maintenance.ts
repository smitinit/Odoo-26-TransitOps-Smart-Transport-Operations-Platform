import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  MaintenanceCreateInput,
  MaintenanceListParams,
  MaintenanceRecord,
  MaintenanceUpdateInput,
} from "@/lib/api/types"

function buildQuery(params: MaintenanceListParams = {}) {
  const query = new URLSearchParams()
  if (params.skip != null) query.set("skip", String(params.skip))
  if (params.limit != null) query.set("limit", String(params.limit))
  if (params.status && params.status !== "ALL") query.set("status", params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

export async function listMaintenance(params: MaintenanceListParams = {}) {
  const response = await apiRequest<ApiSuccess<MaintenanceRecord[]>>(
    `/maintenance${buildQuery(params)}`
  )
  return response.data
}

export async function createMaintenance(input: MaintenanceCreateInput) {
  const response = await apiRequest<ApiSuccess<MaintenanceRecord>>("/maintenance", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function updateMaintenance(
  recordId: string,
  input: MaintenanceUpdateInput
) {
  const response = await apiRequest<ApiSuccess<MaintenanceRecord>>(
    `/maintenance/${recordId}`,
    {
      method: "PATCH",
      body: input,
    }
  )
  return response.data
}

export async function deleteMaintenance(recordId: string) {
  await apiRequest<ApiSuccess<null>>(`/maintenance/${recordId}`, {
    method: "DELETE",
  })
}
