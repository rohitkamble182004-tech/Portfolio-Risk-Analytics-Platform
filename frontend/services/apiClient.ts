// frontend/services/apiClient.ts
// API Client with retry logic, interceptors, and error handling

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export class ApiClientError extends Error {
  public status: number;
  public code?: string;
  public detail?: unknown;

  constructor({ status, message, code, detail }: {
    status: number;
    message: string;
    code?: string;
    detail?: unknown;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

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
  // process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://portfolio-risk-analytics-platform.onrender.com/api/v1";


const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 2;
const BASE_RETRY_DELAY_MS = 600;

/* ─── Request ID generator ──────────────────────────────────────────────── */

let _reqCounter = 0;
const nextReqId = () => `rl-${++_reqCounter}`;

/* ─── Delay helper with jitter ──────────────────────────────────────────── */

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

const exponentialBackoff = (attempt: number): number => {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), 10000);
};

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
      config.headers["X-Request-ID"] = nextReqId();
      config.headers["X-Client"] = "risklens-web";

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("risklens_token");
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }

      if (process.env.NODE_ENV === "development") {
        const params = config.params ? ` ${JSON.stringify(config.params)}` : "";
        console.debug(`[API] ▶ ${config.method?.toUpperCase()} ${config.url}${params}`);
      }

      return config;
    },
    (err) => Promise.reject(err)
  );

  /* ── Response interceptor ────────────────────────────────────────────── */

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[API] ✓ ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (err: AxiosError) => {
      const status = err.response?.status ?? 0;
      const data = err.response?.data as any;

      const apiError: ApiClientError = new ApiClientError({
        status,
        message:
          data?.detail?.msg ??
          data?.detail ??
          data?.message ??
          err.message ??
          "An unexpected error occurred",
        code: data?.code,
        detail: data?.detail,
      });

      if (process.env.NODE_ENV === "development") {
        console.error(`[API] ✗ ${status} ${err.config?.url}`, apiError);
      }

      return Promise.reject(apiError);
    }
  );

  return client;
}

/* ─── Singleton instance ─────────────────────────────────────────────────── */

const httpClient = buildClient();

/* ─── Typed request wrappers with retry ─────────────────────────────────── */

async function request<T>(
  config: AxiosRequestConfig,
  attempts = MAX_RETRY_ATTEMPTS,
  attempt = 0
): Promise<T> {
  try {
    const { data } = await httpClient.request<T>(config);
    return data;
  } catch (err: any) {
    // Only retry on network errors or 5xx, not on 4xx
    const isRetryable =
      !err.status ||
      err.status >= 500 ||
      err.message?.includes("timeout") ||
      err.message?.includes("Network Error");

    if (attempts > 0 && isRetryable) {
      const delayMs = exponentialBackoff(attempt);
      await delay(delayMs);
      return request<T>(config, attempts - 1, attempt + 1);
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
  getInstance(): AxiosInstance {
    return httpClient;
  },

  /** Change base URL at runtime */
  setBaseURL(url: string): void {
    httpClient.defaults.baseURL = url;
  },

  getBaseURL(): string {
    return httpClient.defaults.baseURL as string;
  },
};

export default apiClient;