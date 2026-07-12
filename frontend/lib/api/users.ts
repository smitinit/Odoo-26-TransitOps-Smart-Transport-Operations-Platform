import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  Role,
  User,
  UserCreateInput,
  UserUpdateInput,
} from "@/lib/api/types"

export async function listUsers(skip = 0, limit = 100) {
  const response = await apiRequest<ApiSuccess<User[]>>(
    `/users?skip=${skip}&limit=${limit}`
  )
  return response.data
}

export async function getUser(userId: string) {
  const response = await apiRequest<ApiSuccess<User>>(`/users/${userId}`)
  return response.data
}

export async function createUser(input: UserCreateInput) {
  const response = await apiRequest<ApiSuccess<User>>("/users", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function updateUser(userId: string, input: UserUpdateInput) {
  const response = await apiRequest<ApiSuccess<User>>(`/users/${userId}`, {
    method: "PATCH",
    body: input,
  })
  return response.data
}

export async function deleteUser(userId: string) {
  const response = await apiRequest<ApiSuccess<User>>(`/users/${userId}`, {
    method: "DELETE",
  })
  return response.data
}

export async function listRoles() {
  const response = await apiRequest<ApiSuccess<Role[]>>("/roles")
  return response.data
}
