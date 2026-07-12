import { apiRequest } from "@/lib/api/client"
import type { ApiSuccess, GeneralSettings, GeneralSettingsUpdate } from "@/lib/api/types"

export async function getGeneralSettings() {
  const response = await apiRequest<ApiSuccess<GeneralSettings>>(
    "/settings/general"
  )
  return response.data
}

export async function updateGeneralSettings(input: GeneralSettingsUpdate) {
  const response = await apiRequest<ApiSuccess<GeneralSettings>>(
    "/settings/general",
    {
      method: "PUT",
      body: input,
    }
  )
  return response.data
}
