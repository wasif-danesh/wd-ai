// Server-side reads from the API. Pages are server components, so they call the API directly
// (the same network position as the BFF route handlers); the browser never does.
import { apiAuthHeaders } from "./api-token";
import { API_BASE_URL } from "./proxy";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const identity = await apiAuthHeaders();
  if (!identity) throw new ApiError(401, "sign in required");
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", headers: identity });
  if (!res.ok) throw new ApiError(res.status, `API ${path} answered ${res.status}`);
  return (await res.json()) as T;
}
