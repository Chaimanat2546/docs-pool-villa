import { verifyMediaUploadTicket } from "../../../src/lib/media/upload-ticket";

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ Vary: "Origin" });
  if (request.headers.get("Origin") === env.ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "PUT, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Docs-Media-Ticket");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function json(request: Request, env: Env, status: number, body: Record<string, string>): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

function isDocsImageKey(key: string, documentId: string, mediaId: string): boolean {
  return key === `docs/${documentId}/${mediaId}.webp` && /^docs\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key) && !key.includes("..");
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export default {
  async fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    void _context;
    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method !== "PUT" || new URL(request.url).pathname !== "/uploads") {
      return json(request, env, 404, { error: "ไม่พบเส้นทาง" });
    }
    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) return json(request, env, 403, { error: "Origin ไม่ได้รับอนุญาต" });
    if (request.headers.get("Content-Type")?.split(";")[0] !== "image/webp") return json(request, env, 415, { error: "รองรับเฉพาะ WebP" });

    const ticket = request.headers.get("X-Docs-Media-Ticket");
    const payload = ticket ? await verifyMediaUploadTicket(ticket, env.DOCS_MEDIA_UPLOAD_SECRET) : null;
    if (!payload || payload.expiresAt <= Date.now() || !isDocsImageKey(payload.objectKey, payload.documentId, payload.mediaId)) {
      return json(request, env, 401, { error: "Upload ticket ไม่ถูกต้องหรือหมดอายุ" });
    }
    if (payload.byteSize <= 0 || payload.byteSize > env.MAX_UPLOAD_BYTES) return json(request, env, 413, { error: "ขนาดไฟล์เกินกำหนด" });

    const buffer = await request.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength !== payload.byteSize) return json(request, env, 400, { error: "ขนาดไฟล์ไม่ตรงกับ ticket" });
    if (!isWebp(bytes)) return json(request, env, 415, { error: "ไฟล์ไม่ใช่ WebP ที่ถูกต้อง" });
    if (await env.DOCS_MEDIA_BUCKET.head(payload.objectKey)) return json(request, env, 409, { error: "ไฟล์นี้ถูกอัปโหลดแล้ว" });

    await env.DOCS_MEDIA_BUCKET.put(payload.objectKey, buffer, {
      httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { documentId: payload.documentId, mediaId: payload.mediaId },
    });
    return json(request, env, 201, { objectKey: payload.objectKey });
  },
} satisfies ExportedHandler<Env>;
