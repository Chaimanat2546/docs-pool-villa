export type MediaUploadTicketPayload = {
  documentId: string;
  mediaId: string;
  objectKey: string;
  contentType: "image/webp";
  byteSize: number;
  expiresAt: number;
};

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
    if (
      !value || typeof value !== "object" ||
      typeof (value as MediaUploadTicketPayload).documentId !== "string" ||
      typeof (value as MediaUploadTicketPayload).mediaId !== "string" ||
      typeof (value as MediaUploadTicketPayload).objectKey !== "string" ||
      (value as MediaUploadTicketPayload).contentType !== "image/webp" ||
      !Number.isInteger((value as MediaUploadTicketPayload).byteSize) ||
      !Number.isFinite((value as MediaUploadTicketPayload).expiresAt)
    ) return null;
    return value as MediaUploadTicketPayload;
  } catch {
    return null;
  }
}
