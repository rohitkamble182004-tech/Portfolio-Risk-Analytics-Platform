import axios from "axios";
import { ApiClientError, get, post, put, patch, del } from "../../services/apiClient";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Build a minimal fake AxiosInstance
const mockRequest = jest.fn();
const mockInstance = {
  get:       jest.fn(),
  post:      jest.fn(),
  put:       jest.fn(),
  patch:     jest.fn(),
  delete:    jest.fn(),
  request:   mockRequest,
  interceptors: {
    request:  { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

(mockedAxios.create as jest.Mock).mockReturnValue(mockInstance);

describe("ApiClientError", () => {
  it("constructs with status and message", () => {
    const err = new ApiClientError({ status: 404, message: "Not found" });
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiClientError");
  });

  it("stores detail and errors fields", () => {
    const err = new ApiClientError({
      status: 422,
      message: "Validation error",
      detail: "Field error",
      errors: { ticker: ["Ticker is required"] },
    });
    expect(err.detail).toBe("Field error");
    expect(err.errors?.ticker).toEqual(["Ticker is required"]);
  });

  it("is instance of Error", () => {
    const err = new ApiClientError({ status: 500, message: "Internal error" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiClientError);
  });
});

describe("HTTP convenience wrappers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("get() calls instance.get and returns data", async () => {
    mockInstance.get.mockResolvedValue({ data: { id: 1 } });
    const result = await get("/test");
    expect(mockInstance.get).toHaveBeenCalledWith("/test", undefined);
    expect(result).toEqual({ id: 1 });
  });

  it("post() calls instance.post with body", async () => {
    mockInstance.post.mockResolvedValue({ data: { created: true } });
    const result = await post("/test", { name: "foo" });
    expect(mockInstance.post).toHaveBeenCalledWith("/test", { name: "foo" }, undefined);
    expect(result).toEqual({ created: true });
  });

  it("put() calls instance.put with body", async () => {
    mockInstance.put.mockResolvedValue({ data: { updated: true } });
    const result = await put("/test/1", { name: "bar" });
    expect(mockInstance.put).toHaveBeenCalledWith("/test/1", { name: "bar" }, undefined);
    expect(result).toEqual({ updated: true });
  });

  it("patch() calls instance.patch with body", async () => {
    mockInstance.patch.mockResolvedValue({ data: { patched: true } });
    const result = await patch("/test/1", { value: 42 });
    expect(mockInstance.patch).toHaveBeenCalledWith("/test/1", { value: 42 }, undefined);
    expect(result).toEqual({ patched: true });
  });

  it("del() calls instance.delete", async () => {
    mockInstance.delete.mockResolvedValue({ data: null });
    const result = await del("/test/1");
    expect(mockInstance.delete).toHaveBeenCalledWith("/test/1", undefined);
    expect(result).toBeNull();
  });

  it("get() propagates errors", async () => {
    mockInstance.get.mockRejectedValue(new ApiClientError({ status: 500, message: "Server error" }));
    await expect(get("/fail")).rejects.toBeInstanceOf(ApiClientError);
  });
});