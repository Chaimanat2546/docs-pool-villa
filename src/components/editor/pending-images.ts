"use client";

export type PendingImage = {
  id: string;
  file: File;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  status: "ready" | "uploading" | "error";
  progress?: number;
  error?: string;
};

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const heicTypes = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const maxSourceBytes = 10 * 1024 * 1024;
const maxDimension = 1920;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

function throwIfAborted(signal?: AbortSignal) {
  signal?.throwIfAborted();
}

function isHeic(file: File) {
  return heicTypes.has(file.type.toLowerCase()) || /\.(?:heic|heif)$/i.test(file.name);
}

async function decodeHeic(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const decoded = await heic2any({ blob: file, toType: "image/jpeg", quality: 1 });
    const blob = Array.isArray(decoded) ? decoded[0] : decoded;
    if (!(blob instanceof Blob)) throw new Error("HEIC decoder returned no image");
    return blob;
  } catch {
    throw new Error("ไม่สามารถอ่านไฟล์ HEIC หรือ HEIF นี้ได้");
  }
}

async function loadImage(blob: Blob, signal?: AbortSignal): Promise<DecodedImage> {
  throwIfAborted(signal);

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      if (signal?.aborted) {
        bitmap.close();
        throwIfAborted(signal);
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const sourceUrl = URL.createObjectURL(blob);
  const image = document.createElement("img");
  try {
    image.src = sourceUrl;
    await image.decode();
    throwIfAborted(signal);
    if (image.naturalWidth < 1 || image.naturalHeight < 1) throw new Error("Invalid image dimensions");
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => {
        image.removeAttribute("src");
        URL.revokeObjectURL(sourceUrl);
      },
    };
  } catch (error) {
    image.removeAttribute("src");
    URL.revokeObjectURL(sourceUrl);
    if (signal?.aborted) throw error;
    throw new Error("ไม่สามารถอ่านไฟล์รูปนี้ได้");
  }
}

export type UploadedPendingImage = {
  mediaId: string;
  objectKey: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};
export type MediaTicket = { uploadUrl: string; ticket: string; mediaId: string; objectKey: string };

export async function uploadPendingImage(
  documentId: string,
  image: PendingImage,
  onProgress: (progress: number) => void,
  createTicket: (input: { documentId: string; byteSize: number; width: number; height: number }) => Promise<MediaTicket | { error: string }>,
): Promise<UploadedPendingImage> {
  const ticket = await createTicket({ documentId, byteSize: image.blob.size, width: image.width, height: image.height });
  if ("error" in ticket) throw new Error(ticket.error);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    request.setRequestHeader("Content-Type", "image/webp");
    request.setRequestHeader("X-Docs-Media-Ticket", ticket.ticket);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status === 201) {
        try {
          const response: unknown = JSON.parse(request.responseText);
          if (
            !response || typeof response !== "object" ||
            (response as UploadedPendingImage).mediaId !== ticket.mediaId ||
            (response as UploadedPendingImage).objectKey !== ticket.objectKey ||
            (response as UploadedPendingImage).mimeType !== "image/webp" ||
            !Number.isInteger((response as UploadedPendingImage).sizeBytes) ||
            !Number.isInteger((response as UploadedPendingImage).width) ||
            !Number.isInteger((response as UploadedPendingImage).height)
          ) throw new Error();
          onProgress(100);
          resolve(response as UploadedPendingImage);
          return;
        } catch {
          reject(new Error("ผลลัพธ์จาก Docs Media Worker ไม่ถูกต้อง"));
          return;
        }
      }
      try {
        const response: unknown = JSON.parse(request.responseText);
        if (
          response && typeof response === "object" &&
          "error" in response && typeof response.error === "string" &&
          response.error.length <= 200
        ) {
          reject(new Error(response.error));
          return;
        }
      } catch {
        // The fallback below intentionally hides non-JSON upstream responses.
      }
      reject(new Error("อัปโหลดรูปไม่สำเร็จ"));
    });
    request.addEventListener("error", () => reject(new Error("เชื่อมต่อ Docs Media Worker ไม่สำเร็จ")));
    request.send(image.blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, "image/webp", 0.85);
    } catch {
      resolve(null);
    }
  });
}

async function encodeWebp(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): Promise<Blob> {
  const nativeBlob = await canvasToBlob(canvas);
  if (nativeBlob?.type === "image/webp") return nativeBlob;

  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { encode } = await import("@jsquash/webp");
    const bytes = await encode(imageData, { quality: 85 });
    return new Blob([bytes], { type: "image/webp" });
  } catch {
    throw new Error("ไม่สามารถแปลงรูปเป็น WebP ได้");
  }
}

export async function preparePendingImage(file: File, signal?: AbortSignal): Promise<PendingImage> {
  const heic = isHeic(file);
  if (!heic && !allowedTypes.has(file.type.toLowerCase())) {
    throw new Error("รองรับเฉพาะ JPG, PNG, WebP, HEIC และ HEIF");
  }
  if (file.size > maxSourceBytes) throw new Error("รูปต้องมีขนาดไม่เกิน 10 MB");
  throwIfAborted(signal);

  const normalizedSource = heic ? await decodeHeic(file) : file;
  throwIfAborted(signal);
  const decoded = await loadImage(normalizedSource, signal);
  const canvas = document.createElement("canvas");
  try {
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
    const targetWidth = Math.max(1, Math.round(decoded.width * scale));
    const targetHeight = Math.max(1, Math.round(decoded.height * scale));
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการเตรียมรูป");
    context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);
    throwIfAborted(signal);
    const blob = await encodeWebp(canvas, context);
    throwIfAborted(signal);
    return {
      id: crypto.randomUUID(),
      file,
      blob,
      previewUrl: URL.createObjectURL(blob),
      width: targetWidth,
      height: targetHeight,
      status: "ready",
    };
  } finally {
    decoded.release();
    canvas.width = 0;
    canvas.height = 0;
  }
}
