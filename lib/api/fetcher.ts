export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

interface FetchOptions extends RequestInit {
  data?: unknown
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, ...fetchOptions } = options

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  }

  if (data) {
    config.body = JSON.stringify(data)
  }

  const response = await fetch(endpoint, config)

  // Handle empty responses (like DELETE)
  const text = await response.text()
  const json = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new ApiError(json.error || "An error occurred", response.status, json.code)
  }

  return json.data
}

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),

  post: <T>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: "POST", data }),

  patch: <T>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: "PATCH", data }),

  put: <T>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: "PUT", data }),

  delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "DELETE" }),
}
