import { apiRequest } from "@/lib/api/client"
import { clearTokens, setTokens } from "@/lib/api/tokens"
import type { ApiSuccess, TokenResponse, User } from "@/lib/api/types"

export async function login(email: string, password: string) {
  const tokens = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    formUrlEncoded: true,
    body: {
      username: email,
      password,
    },
  })

  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

export async function refreshTokens(refreshToken: string) {
  const tokens = await apiRequest<TokenResponse>("/auth/refresh", {
    method: "POST",
    auth: false,
    body: { refresh_token: refreshToken },
  })
  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

export async function logout() {
  try {
    await apiRequest<ApiSuccess<Record<string, never>>>("/auth/logout", {
      method: "POST",
      auth: false,
    })
  } finally {
    clearTokens()
  }
}

export async function getCurrentUser() {
  const response = await apiRequest<ApiSuccess<User>>("/users/me", {
    method: "GET",
  })
  return response.data
}
