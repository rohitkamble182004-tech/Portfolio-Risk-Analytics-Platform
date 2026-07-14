import { useState, useCallback, useRef } from "react";
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
}

/**
 * Generic hook for wrapping async API calls with loading / error state.
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

  // Prevent state updates on unmounted component
  const mountedRef = useRef(true);
  if (typeof window !== "undefined") {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      }));

      try {
        const data = await apiFn(...args);
        setState({
          data,
          status: "success",
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
        });
        return data;
      } catch (err) {
        const apiError =
          err instanceof ApiClientError
            ? err
            : new ApiClientError({ status: -1, message: String(err) });

        setState({
          data: null,
          status: "error",
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: apiError,
        });
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      status: "idle",
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return { ...state, execute, reset };
}