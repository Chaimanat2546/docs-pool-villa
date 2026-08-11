import { env } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { signMediaUploadTicket } from "../../../src/lib/media/upload-ticket";
import worker from "../src";

const documentId = "11111111-1111-4111-8111-111111111111";
const mediaId = "22222222-2222-4222-8222-222222222222";
const objectKey = `docs/${documentId}/${mediaId}.webp`;

// A structurally valid 1 x 1 VP8L WebP container.
const webp = new Uint8Array([
  82, 73, 70, 70, 18, 0, 0, 0, 87, 69, 66, 80,
  86, 80, 56, 76, 5, 0, 0, 0, 47, 0, 0, 0, 0, 0,
]);
const oversizedWebp = new Uint8Array([
  82, 73, 70, 70, 18, 0, 0, 0, 87, 69, 66, 80,
  86, 80, 56, 76, 5, 0, 0, 0, 47, 128, 7, 0, 0, 0,
]);

async function makeTicket(overrides: Partial<{ byteSize: number; width: number; height: number; expiresAt: number }> = {}) {
  return signMediaUploadTicket({
    documentId,
    mediaId,
    objectKey,
    contentType: "image/webp",
    byteSize: overrides.byteSize ?? webp.byteLength,
    width: overrides.width ?? 1,
    height: overrides.height ?? 1,
    expiresAt: overrides.expiresAt ?? Date.now() + 60_000,
  }, "test-docs-media-secret");
}

async function request(overrides: {
  origin?: string;
  ticket?: string;
  body?: BodyInit;
  contentType?: string;
  contentLength?: string;
} = {}) {
  const ticket = overrides.ticket ?? await makeTicket();
  const headers = new Headers({
    Origin: overrides.origin ?? "http://localhost:3000",
    "Content-Type": overrides.contentType ?? "image/webp",
    "X-Docs-Media-Ticket": ticket,
  });
  if (overrides.contentLength) headers.set("Content-Length", overrides.contentLength);
  return worker.fetch(new Request("https://media.example.test/uploads", {
    method: "PUT",
    headers,
    body: overrides.body ?? webp,
  }), env, createExecutionContext());
}

describe("Docs Media Worker", () => {
  it("rejects an upload from an unapproved origin", async () => {
    expect((await request({ origin: "https://attacker.example" })).status).toBe(403);
  });

  it("rejects invalid tickets, malformed WebP, and mismatched dimensions", async () => {
    expect((await request({ ticket: "invalid" })).status).toBe(401);
    expect((await request({
      ticket: await makeTicket({ byteSize: 12 }),
      body: new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
    })).status).toBe(415);
    expect((await request({ body: oversizedWebp })).status).toBe(415);
    expect((await request({ ticket: await makeTicket({ width: 2 }) })).status).toBe(400);
  });

  it("enforces ticket byte size before storing the image", async () => {
    expect((await request({ ticket: await makeTicket({ byteSize: webp.byteLength + 1 }) })).status).toBe(400);
    expect((await request({ contentLength: String(webp.byteLength + 1) })).status).toBe(400);
  });

  it("stores a verified WebP only in the permitted Docs key and returns metadata", async () => {
    const response = await request();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ objectKey, mediaId, mimeType: "image/webp", sizeBytes: webp.byteLength, width: 1, height: 1 });
    expect(await env.DOCS_MEDIA_BUCKET.head(objectKey)).not.toBeNull();
  });

  it("rejects a replayed ticket without overwriting the object", async () => {
    const replayId = "33333333-3333-4333-8333-333333333333";
    const replayKey = `docs/${documentId}/${replayId}.webp`;
    const ticket = await signMediaUploadTicket({
      documentId,
      mediaId: replayId,
      objectKey: replayKey,
      contentType: "image/webp",
      byteSize: webp.byteLength,
      width: 1,
      height: 1,
      expiresAt: Date.now() + 60_000,
    }, "test-docs-media-secret");
    expect((await request({ ticket })).status).toBe(201);
    expect((await request({ ticket })).status).toBe(409);
  });
});
