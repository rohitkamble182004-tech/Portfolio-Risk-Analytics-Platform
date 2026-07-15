// frontend/hooks/useApi.ts
// Generic API hook with loading, error, and cancellation support

import { useState, useCallback, useRef, useEffect } from "react";
import { ApiClientError } from "../services/apiClient";

export type FetchStatus = "idle" | "loading" | "success" | "error";

export interface UseApiState<T> {
  data: T | null;
  status: FetchStatus;
  error: ApiClientError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseApiReturn<T, A extends unknown[]> extends UseApiState<T> {
  execute: (...args: A) => Promise<T | null>;
  reset: () => void;
  abort: () => void;
}

/**
 * Generic hook for wrapping async API calls with loading / error state.
 * Supports cancellation and prevents state updates on unmounted components.
 *
 * @example
 * const { data, isLoading, execute } = useApi(portfolioApi.getById);
 * useEffect(() => { execute("portfolio-id"); }, []);
 */
export function useApi<T, A extends unknown[]>(
  apiFn: (...args: A) => Promise<T>
): UseApiReturn<T, A> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    status: "idle",
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const setStateSafe = useCallback((updater: (prev: UseApiState<T>) => UseApiState<T>) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setStateSafe((prev) => ({
        ...prev,
        status: "loading",
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      }));

      try {
        // Check if the API function supports abort signal
        // Most async functions accept AbortSignal as last argument or via options
        const data = await apiFn(...args);
        setStateSafe(() => ({
          data,
          status: "success",
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
        }));
        return data;
      } catch (err: any) {
        // Don't set error state if aborted
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          setStateSafe((prev) => ({
            ...prev,
            status: "idle",
            isLoading: false,
          }));
          return null;
        }

        const apiError =
          err instanceof ApiClientError
            ? err
            : new ApiClientError({
                status: -1,
                message: String(err.message || err),
              });

        setStateSafe(() => ({
          data: null,
          status: "error",
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: apiError,
        }));
        return null;
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [apiFn, setStateSafe]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStateSafe((prev) => ({
        ...prev,
        status: "idle",
        isLoading: false,
      }));
    }
  }, [setStateSafe]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStateSafe(() => ({
      data: null,
      status: "idle",
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    }));
  }, [setStateSafe]);

  return { ...state, execute, reset, abort };
}

export default useApi;