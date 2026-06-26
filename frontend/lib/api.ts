import { clearSession, getToken } from "./auth";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveApiBaseUrl() {
  if (typeof window === "undefined") return configuredApiUrl;

  const pageHost = window.location.hostname;
  const pageProtocol = window.location.protocol;

  try {
    const configured = new URL(configuredApiUrl);
    const localPage = pageHost === "localhost" || pageHost === "127.0.0.1";
    const configuredIsLocal = configured.hostname === "localhost" || configured.hostname === "127.0.0.1";

    if (localPage && !configuredIsLocal) {
      return `${pageProtocol}//${pageHost}:8000`;
    }

    if (!localPage && configuredIsLocal) {
      return `${pageProtocol}//${pageHost}:8000`;
    }

    return configuredApiUrl;
  } catch {
    return `${pageProtocol}//${pageHost}:8000`;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();
type RequestOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token && !options.skipAuth) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Unable to reach the API at ${API_BASE_URL}. Start the backend server, then try again.`);
  }

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>(path, { method: "POST", body: JSON.stringify(body), ...options }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" })
};
