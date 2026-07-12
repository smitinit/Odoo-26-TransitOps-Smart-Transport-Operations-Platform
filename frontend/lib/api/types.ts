export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorBody = {
  success: false
  message: string
  errors?: unknown[]
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_superuser: boolean
  role_id: string | null
  created_at?: string
  updated_at?: string
}

export class ApiError extends Error {
  status: number
  errors: unknown[]

  constructor(message: string, status: number, errors: unknown[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}
