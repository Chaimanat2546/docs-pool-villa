import { verifyMediaDeleteTicket, verifyMediaUploadTicket } from "../../../src/lib/media/upload-ticket";

import { parseWebpImage } from "./webp";

function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && env.ALLOWED_ORIGIN.split(",").map((value) => value.trim()).includes(origin);
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("Origin");
  if (origin !== null && isAllowedOrigin(request, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Docs-Media-Ticket, X-Docs-Media-Delete-Ticket");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function json(request: Request, env: Env, status: number, body: Record<string, string | number>): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

function isDocsImageKey(key: string, documentId: string, mediaId: string): boolean {
  return key === `docs/${documentId}/${mediaId}.webp` && /^docs\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key) && !key.includes("..");
}

function objectKeyFromPublicPath(pathname: string): string | null {
  const match = /^\/objects\/docs\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.webp$/i.exec(pathname);
  if (!match) return null;
  return `docs/${match[1]}/${match[2]}.webp`;
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/uploads") return json(request, env, 404, { error: "ไม่พบเส้นทาง" });

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request, env)) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (request.method !== "PUT") return json(request, env, 405, { error: "ไม่รองรับวิธีเรียกนี้" });
  if (!isAllowedOrigin(request, env)) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "image/webp") return json(request, env, 415, { error: "รองรับเฉพาะ WebP" });

  const ticket = request.headers.get("X-Docs-Media-Ticket");
  const payload = ticket ? await verifyMediaUploadTicket(ticket, env.DOCS_MEDIA_UPLOAD_SECRET) : null;
  if (!payload || payload.expiresAt <= Date.now() || !isDocsImageKey(payload.objectKey, payload.documentId, payload.mediaId)) {
    return json(request, env, 401, { error: "Upload ticket ไม่ถูกต้องหรือหมดอายุ" });
  }
  if (payload.byteSize > env.MAX_UPLOAD_BYTES) return json(request, env, 413, { error: "ขนาดไฟล์เกินกำหนด" });

  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) !== payload.byteSize)) {
    return json(request, env, 400, { error: "ขนาดไฟล์ไม่ตรงกับ ticket" });
  }

  const bytes = await readBoundedBody(request, env.MAX_UPLOAD_BYTES);
  if (!bytes || bytes.byteLength !== payload.byteSize) return json(request, env, 400, { error: "ขนาดไฟล์ไม่ตรงกับ ticket" });
  const image = parseWebpImage(bytes);
  if (!image) return json(request, env, 415, { error: "ไฟล์ไม่ใช่ WebP ที่ถูกต้อง" });
  if (image.width !== payload.width || image.height !== payload.height) return json(request, env, 400, { error: "ขนาดรูปไม่ตรงกับ ticket" });

  const object = await env.DOCS_MEDIA_BUCKET.put(payload.objectKey, bytes, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: {
      documentId: payload.documentId,
      mediaId: payload.mediaId,
      width: String(image.width),
      height: String(image.height),
    },
  });
  if (!object) return json(request, env, 409, { error: "ไฟล์นี้ถูกอัปโหลดแล้ว" });
  return json(request, env, 201, {
    objectKey: payload.objectKey,
    mediaId: payload.mediaId,
    mimeType: "image/webp",
    sizeBytes: bytes.byteLength,
    width: image.width,
    height: image.height,
  });
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/objects") return json(request, env, 404, { error: "ไม่พบเส้นทาง" });
  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request, env)) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (request.method !== "DELETE") return json(request, env, 405, { error: "ไม่รองรับวิธีเรียกนี้" });
  const origin = request.headers.get("Origin");
  if (origin !== null && !isAllowedOrigin(request, env)) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
  // Keep the legacy delete-specific header for retries from older app builds.
  // The shared ticket header is known to survive the deployed request path; the
  // signed operation inside the ticket still binds this request to DELETE only.
  const ticket = request.headers.get("X-Docs-Media-Ticket") ?? request.headers.get("X-Docs-Media-Delete-Ticket");
  const payload = ticket ? await verifyMediaDeleteTicket(ticket, env.DOCS_MEDIA_UPLOAD_SECRET) : null;
  if (!payload || payload.expiresAt <= Date.now()) return json(request, env, 401, { error: "Delete ticket ไม่ถูกต้องหรือหมดอายุ" });
  await env.DOCS_MEDIA_BUCKET.delete(payload.objectKeys);
  return json(request, env, 200, { deleted: payload.objectKeys.length });
}

async function handlePublicObject(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json(request, env, 405, { error: "ไม่รองรับวิธีเรียกนี้" });
  const objectKey = objectKeyFromPublicPath(new URL(request.url).pathname);
  if (!objectKey) return json(request, env, 404, { error: "ไม่พบรูป" });
  const object = await env.DOCS_MEDIA_BUCKET.get(objectKey);
  if (!object) return json(request, env, 404, { error: "ไม่พบรูป" });
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "image/webp");
  headers.set("Cache-Control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    void _context;
    try {
      const path = new URL(request.url).pathname;
      if (path === "/uploads") return await handleUpload(request, env);
      if (path === "/objects") return await handleDelete(request, env);
      if (path.startsWith("/objects/")) return await handlePublicObject(request, env);
      return json(request, env, 404, { error: "ไม่พบเส้นทาง" });
    } catch (error) {
      console.error(JSON.stringify({
        message: "docs media request failed",
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return json(request, env, 500, { error: "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }
  },
} satisfies ExportedHandler<Env>;
