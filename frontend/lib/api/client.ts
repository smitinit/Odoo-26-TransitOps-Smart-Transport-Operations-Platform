import { API_BASE_URL } from "@/lib/api/config"
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api/tokens"
import { ApiError, type ApiErrorBody, type TokenResponse } from "@/lib/api/types"

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null
  auth?: boolean
  skipRefresh?: boolean
  formUrlEncoded?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function parseJsonSafe(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    clearTokens()
    return false
  }

  const data = (await response.json()) as TokenResponse
  setTokens(data.access_token, data.refresh_token)
  return true
}

function ensureRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    auth = true,
    skipRefresh = false,
    formUrlEncoded = false,
    headers: initHeaders,
    body,
    ...rest
  } = options

  const headers = new Headers(initHeaders)

  if (formUrlEncoded) {
    headers.set("Content-Type", "application/x-www-form-urlencoded")
  } else if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json")
  }

  if (auth) {
    const accessToken = getAccessToken()
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`)
    }
  }

  let requestBody: BodyInit | undefined
  if (body == null) {
    requestBody = undefined
  } else if (typeof body === "string" || body instanceof FormData) {
    requestBody = body
  } else if (formUrlEncoded) {
    requestBody = new URLSearchParams(
      Object.entries(body).map(([key, value]) => [key, String(value)])
    )
  } else {
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: requestBody,
  })

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true })
    }
  }

  const payload = await parseJsonSafe(response)

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | null
    throw new ApiError(
      errorBody?.message ?? `Request failed (${response.status})`,
      response.status,
      errorBody?.errors ?? []
    )
  }

  return payload as T
}
