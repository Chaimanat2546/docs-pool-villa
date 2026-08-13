export type MediaUploadTicketPayload = {
  documentId: string;
  mediaId: string;
  objectKey: string;
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  expiresAt: number;
};

export type MediaDeleteTicketPayload = {
  operation: "delete";
  operationId: string;
  operationType: "save_remove" | "document_delete" | "section_delete" | "cleanup";
  documentId: string;
  objectKeys: string[];
  expiresAt: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function safeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export async function signMediaUploadTicket(payload: MediaUploadTicketPayload, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encodedPayload}.${toBase64Url(await hmac(secret, encodedPayload))}`;
}

export async function verifyMediaUploadTicket(ticket: string, secret: string): Promise<MediaUploadTicketPayload | null> {
  const [encodedPayload, encodedSignature, ...extra] = ticket.split(".");
  if (!encodedPayload || !encodedSignature || extra.length > 0) return null;
  const signature = fromBase64Url(encodedSignature);
  const payloadBytes = fromBase64Url(encodedPayload);
  if (!signature || !payloadBytes || !safeEqual(signature, await hmac(secret, encodedPayload))) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const payload = value as Partial<MediaUploadTicketPayload>;
    if (
      typeof payload.documentId !== "string" || !uuidPattern.test(payload.documentId) ||
      typeof payload.mediaId !== "string" || !uuidPattern.test(payload.mediaId) ||
      typeof payload.objectKey !== "string" ||
      payload.objectKey !== `docs/${payload.documentId}/${payload.mediaId}.webp` ||
      payload.contentType !== "image/webp" ||
      typeof payload.byteSize !== "number" || !Number.isInteger(payload.byteSize) || payload.byteSize <= 0 || payload.byteSize > 10 * 1024 * 1024 ||
      typeof payload.width !== "number" || !Number.isInteger(payload.width) || payload.width <= 0 || payload.width > 1920 ||
      typeof payload.height !== "number" || !Number.isInteger(payload.height) || payload.height <= 0 || payload.height > 1920 ||
      typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= 0
    ) return null;
    return payload as MediaUploadTicketPayload;
  } catch {
    return null;
  }
}

function isDocumentMediaKey(documentId: string, key: string): boolean {
  return new RegExp(`^docs/${documentId}/[0-9a-f-]{36}\\.webp$`, "i").test(key);
}

export async function signMediaDeleteTicket(payload: MediaDeleteTicketPayload, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encodedPayload}.${toBase64Url(await hmac(secret, encodedPayload))}`;
}

export async function verifyMediaDeleteTicket(ticket: string, secret: string): Promise<MediaDeleteTicketPayload | null> {
  const [encodedPayload, encodedSignature, ...extra] = ticket.split(".");
  if (!encodedPayload || !encodedSignature || extra.length > 0) return null;
  const signature = fromBase64Url(encodedSignature);
  const payloadBytes = fromBase64Url(encodedPayload);
  if (!signature || !payloadBytes || !safeEqual(signature, await hmac(secret, encodedPayload))) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const payload = value as Partial<MediaDeleteTicketPayload>;
    if (
      payload.operation !== "delete" ||
      typeof payload.operationId !== "string" || !uuidPattern.test(payload.operationId) ||
      (payload.operationType !== "save_remove" && payload.operationType !== "document_delete" && payload.operationType !== "section_delete" && payload.operationType !== "cleanup") ||
      typeof payload.documentId !== "string" || !uuidPattern.test(payload.documentId) ||
      !Array.isArray(payload.objectKeys) || payload.objectKeys.length === 0 || payload.objectKeys.length > 1_000 ||
      new Set(payload.objectKeys).size !== payload.objectKeys.length ||
      !payload.objectKeys.every((key) => typeof key === "string" && isDocumentMediaKey(payload.documentId!, key)) ||
      typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= 0
    ) return null;
    return payload as MediaDeleteTicketPayload;
  } catch {
    return null;
  }
}
