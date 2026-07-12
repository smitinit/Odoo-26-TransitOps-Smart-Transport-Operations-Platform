import { apiRequest } from "@/lib/api/client"
import type {
  ApiSuccess,
  Expense,
  ExpenseCreateInput,
  FuelLog,
  FuelLogCreateInput,
  OpsCostSummary,
} from "@/lib/api/types"

export async function listFuelLogs(limit = 100) {
  const response = await apiRequest<ApiSuccess<FuelLog[]>>(
    `/fuel-logs?limit=${limit}`
  )
  return response.data
}

export async function createFuelLog(input: FuelLogCreateInput) {
  const response = await apiRequest<ApiSuccess<FuelLog>>("/fuel-logs", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function listExpenses(limit = 100) {
  const response = await apiRequest<ApiSuccess<Expense[]>>(
    `/expenses?limit=${limit}`
  )
  return response.data
}

export async function createExpense(input: ExpenseCreateInput) {
  const response = await apiRequest<ApiSuccess<Expense>>("/expenses", {
    method: "POST",
    body: input,
  })
  return response.data
}

export async function getOpsCostSummary() {
  const response = await apiRequest<ApiSuccess<OpsCostSummary>>(
    "/finance/ops-cost"
  )
  return response.data
}
