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
const maxSourceBytes = 10 * 1024 * 1024;
const maxDimension = 1920;

async function loadImage(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { bitmap, width: bitmap.width, height: bitmap.height };
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
      reject(new Error("อัปโหลดรูปไม่สำเร็จ"));
    });
    request.addEventListener("error", () => reject(new Error("เชื่อมต่อ Docs Media Worker ไม่สำเร็จ")));
    request.send(image.blob);
  });
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("ไม่สามารถแปลงรูปเป็น WebP ได้")), "image/webp", 0.85);
  });
}

export async function preparePendingImage(file: File): Promise<PendingImage> {
  if (!allowedTypes.has(file.type)) throw new Error("รองรับเฉพาะ JPG, PNG และ WebP");
  if (file.size > maxSourceBytes) throw new Error("รูปต้องมีขนาดไม่เกิน 10 MB");
  const { bitmap, width, height } = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการเตรียมรูป");
  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();
  const blob = await canvasToWebp(canvas);
  return {
    id: crypto.randomUUID(),
    file,
    blob,
    previewUrl: URL.createObjectURL(blob),
    width: targetWidth,
    height: targetHeight,
    status: "ready",
  };
}
