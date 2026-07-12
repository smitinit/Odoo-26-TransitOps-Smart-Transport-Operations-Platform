import { API_BASE_URL } from "@/lib/api/config"
import { apiRequest } from "@/lib/api/client"
import { getAccessToken } from "@/lib/api/tokens"
import type {
  ApiSuccess,
  AppNotification,
  UnreadCount,
} from "@/lib/api/types"

export async function listNotifications(params?: {
  skip?: number
  limit?: number
  unread_only?: boolean
}) {
  const query = new URLSearchParams()
  if (params?.skip != null) query.set("skip", String(params.skip))
  if (params?.limit != null) query.set("limit", String(params.limit))
  if (params?.unread_only) query.set("unread_only", "true")
  const qs = query.toString()
  const response = await apiRequest<ApiSuccess<AppNotification[]>>(
    `/notifications${qs ? `?${qs}` : ""}`
  )
  return response.data
}

export async function getUnreadNotificationCount() {
  const response = await apiRequest<ApiSuccess<UnreadCount>>(
    "/notifications/unread-count"
  )
  return response.data.count
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiRequest<ApiSuccess<AppNotification>>(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" }
  )
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await apiRequest<ApiSuccess<UnreadCount>>(
    "/notifications/read-all",
    { method: "POST" }
  )
  return response.data.count
}

export function subscribeNotifications(
  onEvent: (notification: AppNotification) => void,
  onConnected?: (unreadCount: number) => void
) {
  const token = getAccessToken()
  if (!token || typeof window === "undefined") {
    return () => undefined
  }

  const url = `${API_BASE_URL}/notifications/stream?access_token=${encodeURIComponent(token)}`
  const source = new EventSource(url)

  source.addEventListener("connected", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as {
        unread_count?: number
      }
      onConnected?.(data.unread_count ?? 0)
    } catch {
      onConnected?.(0)
    }
  })

  source.addEventListener("notification", (event) => {
    try {
      const data = JSON.parse(
        (event as MessageEvent).data
      ) as AppNotification
      onEvent(data)
    } catch {
      // ignore malformed payloads
    }
  })

  source.onerror = () => {
    // Browser auto-reconnects EventSource; leave open
  }

  return () => {
    source.close()
  }
}
