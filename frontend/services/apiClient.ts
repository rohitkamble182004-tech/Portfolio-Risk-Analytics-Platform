import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

/* ─── Types ─────────────────────────────────────────────────────────────── */
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  detail?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ─── Config ─────────────────────────────────────────────────────────────── */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
console.log({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
const DEFAULT_TIMEOUT = 30_000;
const RETRY_ATTEMPTS  = 2;
const RETRY_DELAY_MS  = 600;

/* ─── Delay helper ──────────────────────────────────────────────────────── */
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/* ─── Request ID ─────────────────────────────────────────────────────────── */
let _reqCounter = 0;
const nextReqId = () => `rl-${++_reqCounter}`;

/* ─── Build client ──────────────────────────────────────────────────────── */
function buildClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    withCredentials: false,
  });

  /* ── Request interceptor ─────────────────────────────────────────────── */
  client.interceptors.request.use(
    (config) => {
      // Tag every request with a unique ID for tracing
      config.headers["X-Request-ID"] = nextReqId();
      config.headers["X-Client"]     = "risklens-web";

      // Attach auth token if present (future: OAuth / JWT)
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("risklens_token");
        if (token) config.headers["Authorization"] = `Bearer ${token}`;
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[API] ▶ ${config.method?.toUpperCase()} ${config.url}`,
          config.params ?? "",
        );
      }

      return config;
    },
    (err) => Promise.reject(err),
  );

  /* ── Response interceptor ────────────────────────────────────────────── */
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[API] ✓ ${response.status} ${response.config.url}`,
          response.data,
        );
      }
      return response;
    },
    (err: AxiosError) => {
      const status  = err.response?.status ?? 0;
      const data    = err.response?.data as any;

      const apiError: ApiError = {
        status,
        message:
          data?.detail?.msg ??
          data?.detail ??
          data?.message ??
          err.message ??
          "An unexpected error occurred",
        code:   data?.code,
        detail: data?.detail,
      };

      if (process.env.NODE_ENV === "development") {
        console.error(`[API] ✗ ${status} ${err.config?.url}`, apiError);
      }

      return Promise.reject(apiError);
    },
  );

  return client;
}

/* ─── Singleton instance ─────────────────────────────────────────────────── */
const httpClient = buildClient();

/* ─── Typed request wrappers with retry ─────────────────────────────────── */
async function request<T>(
  config: AxiosRequestConfig,
  attempts = RETRY_ATTEMPTS,
): Promise<T> {
  try {
    const { data } = await httpClient.request<T>(config);
    return data;
  } catch (err: any) {
    // Retry only on network errors or 5xx, not on 4xx
    const isRetryable =
      !err.status || err.status >= 500;

    if (attempts > 0 && isRetryable) {
      await delay(RETRY_DELAY_MS);
      return request<T>(config, attempts - 1);
    }

    throw err;
  }
}

/* ─── Convenience methods ────────────────────────────────────────────────── */
export const apiClient = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>({ method: "GET", url, params });
  },

  post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: "POST", url, data });
  },

  put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: "PUT", url, data });
  },

  patch<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: "PATCH", url, data });
  },

  delete<T = void>(url: string): Promise<T> {
    return request<T>({ method: "DELETE", url });
  },

  /** Upload multipart/form-data (file uploads) */
  upload<T>(url: string, formData: FormData): Promise<T> {
    return request<T>({
      method: "POST",
      url,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
  },

  /** Raw access to the underlying axios instance */
  instance: httpClient,

  /** Change base URL at runtime (e.g. for API tester panel) */
  setBaseURL(url: string) {
    httpClient.defaults.baseURL = url;
  },

  getBaseURL(): string {
    return httpClient.defaults.baseURL as string;
  },
};

export default apiClient;