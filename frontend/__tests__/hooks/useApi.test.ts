import { renderHook, act } from "@testing-library/react";
import { useApi } from "../../hooks/useApi";
import { ApiClientError } from "../../services/apiClient";

describe("useApi", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useApi(jest.fn()));
    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets loading state while executing", async () => {
    let resolve!: (v: string) => void;
    const apiFn = jest.fn(() => new Promise<string>((r) => { resolve = r; }));
    const { result } = renderHook(() => useApi(apiFn));

    act(() => { result.current.execute(); });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe("loading");

    await act(async () => { resolve("done"); });
  });

  it("sets success state after successful call", async () => {
    const apiFn = jest.fn().mockResolvedValue({ id: 1, name: "Test" });
    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute(); });

    expect(result.current.status).toBe("success");
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ id: 1, name: "Test" });
    expect(result.current.error).toBeNull();
  });

  it("sets error state on ApiClientError", async () => {
    const apiError = new ApiClientError({ status: 404, message: "Not found" });
    const apiFn = jest.fn().mockRejectedValue(apiError);
    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute(); });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(ApiClientError);
    expect(result.current.error?.message).toBe("Not found");
    expect(result.current.error?.status).toBe(404);
  });

  it("sets error state on generic error", async () => {
    const apiFn = jest.fn().mockRejectedValue(new Error("Network fail"));
    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute(); });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Network fail");
  });

  it("resets to idle state when reset() called", async () => {
    const apiFn = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute(); });
    expect(result.current.isSuccess).toBe(true);

    act(() => { result.current.reset(); });
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeNull();
  });

  it("returns data from execute", async () => {
    const apiFn = jest.fn().mockResolvedValue(42);
    const { result } = renderHook(() => useApi(apiFn));

    let returned: number | null = null;
    await act(async () => { returned = await result.current.execute() as number; });
    expect(returned).toBe(42);
  });

  it("returns null from execute on error", async () => {
    const apiFn = jest.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useApi(apiFn));

    let returned: unknown = "initial";
    await act(async () => { returned = await result.current.execute(); });
    expect(returned).toBeNull();
  });

  it("clears previous error on new execute", async () => {
    const apiFn = jest.fn()
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValueOnce("ok");

    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute(); });
    expect(result.current.isError).toBe(true);

    await act(async () => { await result.current.execute(); });
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("passes arguments through to the API function", async () => {
    const apiFn = jest.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => { await result.current.execute("arg1", 42, true); });
    expect(apiFn).toHaveBeenCalledWith("arg1", 42, true);
  });
});