// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { preparePendingImage } from "./pending-images";

const codecs = vi.hoisted(() => ({
  heic2any: vi.fn(),
  encodeWebp: vi.fn(),
}));

vi.mock("heic2any", () => ({ default: codecs.heic2any }));
vi.mock("@jsquash/webp", () => ({ encode: codecs.encodeWebp }));

type BitmapDouble = {
  width: number;
  height: number;
  close: ReturnType<typeof vi.fn>;
};

type BrowserSetup = {
  bitmap?: BitmapDouble;
  bitmapError?: Error;
  fallbackSize?: { width: number; height: number };
  canvasBlob?: Blob | null;
};

function bitmap(width: number, height: number): BitmapDouble {
  return { width, height, close: vi.fn() };
}

function installBrowser({
  bitmap: bitmapResult = bitmap(1600, 900),
  bitmapError,
  fallbackSize = { width: 1600, height: 900 },
  canvasBlob = new Blob(["native-webp"], { type: "image/webp" }),
}: BrowserSetup = {}) {
  const createImageBitmapMock = bitmapError
    ? vi.fn().mockRejectedValue(bitmapError)
    : vi.fn().mockResolvedValue(bitmapResult);
  const drawImage = vi.fn();
  const getImageData = vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
    colorSpace: "srgb",
  });
  const decode = vi.fn().mockResolvedValue(undefined);
  const createObjectURL = vi.fn()
    .mockReturnValueOnce("blob:first")
    .mockReturnValueOnce("blob:second");
  const revokeObjectURL = vi.fn();

  vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  vi.stubGlobal("crypto", { randomUUID: () => "pending-image" });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName === "img") {
      const image = realCreateElement("img");
      Object.defineProperties(image, {
        decode: { value: decode },
        naturalWidth: { value: fallbackSize.width },
        naturalHeight: { value: fallbackSize.height },
      });
      return image;
    }

    if (tagName === "canvas") {
      const canvas = realCreateElement("canvas");
      Object.defineProperties(canvas, {
        getContext: {
          value: vi.fn().mockReturnValue({ drawImage, getImageData }),
        },
        toBlob: {
          value: vi.fn((callback: BlobCallback) => callback(canvasBlob)),
        },
      });
      return canvas;
    }

    return realCreateElement(tagName);
  });

  return {
    bitmap: bitmapResult,
    createImageBitmap: createImageBitmapMock,
    createObjectURL,
    decode,
    drawImage,
    getImageData,
    revokeObjectURL,
  };
}

describe("preparePendingImage", () => {
  beforeEach(() => {
    codecs.heic2any.mockReset();
    codecs.encodeWebp.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("prepares a JPEG through the native bitmap path and releases the decoded bitmap", async () => {
    const browser = installBrowser();

    const result = await preparePendingImage(new File(["jpeg"], "villa.jpg", { type: "image/jpeg" }));

    expect(result).toMatchObject({
      id: "pending-image",
      width: 1600,
      height: 900,
      previewUrl: "blob:first",
      status: "ready",
    });
    expect(result.blob.type).toBe("image/webp");
    expect(browser.bitmap.close).toHaveBeenCalledOnce();
    expect(codecs.heic2any).not.toHaveBeenCalled();
  });

  it("falls back to HTMLImageElement decoding when createImageBitmap rejects", async () => {
    const browser = installBrowser({ bitmapError: new Error("unsupported") });

    const result = await preparePendingImage(new File(["jpeg"], "villa.jpg", { type: "image/jpeg" }));

    expect(result).toMatchObject({
      width: 1600,
      height: 900,
      previewUrl: "blob:second",
    });
    expect(result.blob.type).toBe("image/webp");
    expect(browser.decode).toHaveBeenCalledOnce();
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:first");
  });

  it("lazily decodes HEIC and HEIF extensions before using the shared image path", async () => {
    const decodedJpeg = new Blob(["decoded"], { type: "image/jpeg" });
    codecs.heic2any.mockResolvedValue(decodedJpeg);
    const browser = installBrowser({ bitmap: bitmap(800, 1200) });
    const source = new File(["heif"], "portrait.HEIF", { type: "" });

    const result = await preparePendingImage(source);

    expect(result).toMatchObject({ file: source, width: 800, height: 1200 });
    expect(codecs.heic2any).toHaveBeenCalledWith({
      blob: source,
      toType: "image/jpeg",
      quality: 1,
    });
    expect(browser.createImageBitmap).toHaveBeenCalledWith(decodedJpeg, { imageOrientation: "from-image" });
  });

  it("limits the longest image side to 1920 pixels while preserving aspect ratio", async () => {
    const browser = installBrowser({ bitmap: bitmap(4000, 2000) });

    const result = await preparePendingImage(new File(["png"], "wide.png", { type: "image/png" }));

    expect(result).toMatchObject({ width: 1920, height: 960 });
    expect(browser.drawImage).toHaveBeenCalledWith(browser.bitmap, 0, 0, 1920, 960);
  });

  it("rejects a non-WebP Canvas blob and returns verified WebP from the WASM encoder", async () => {
    const browser = installBrowser({ canvasBlob: new Blob(["png"], { type: "image/png" }) });
    codecs.encodeWebp.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    const result = await preparePendingImage(new File(["png"], "fallback.png", { type: "image/png" }));

    expect(result.blob.type).toBe("image/webp");
    expect(result.blob.size).toBe(3);
    expect(browser.getImageData).toHaveBeenCalledWith(0, 0, 1600, 900);
    expect(codecs.encodeWebp).toHaveBeenCalledOnce();
  });

  it("reports a conversion error when the native and WASM encoders both fail", async () => {
    installBrowser({ canvasBlob: null });
    codecs.encodeWebp.mockRejectedValue(new Error("wasm unavailable"));

    await expect(
      preparePendingImage(new File(["jpeg"], "broken.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("ไม่สามารถแปลงรูปเป็น WebP ได้");
    expect(codecs.encodeWebp).toHaveBeenCalledOnce();
  });

  it("releases a decoded bitmap when cancellation wins the decode race", async () => {
    const controller = new AbortController();
    const browser = installBrowser();
    browser.createImageBitmap.mockImplementation(async () => {
      controller.abort();
      return browser.bitmap;
    });

    await expect(
      preparePendingImage(
        new File(["jpeg"], "cancelled.jpg", { type: "image/jpeg" }),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(browser.bitmap.close).toHaveBeenCalledOnce();
  });
});
