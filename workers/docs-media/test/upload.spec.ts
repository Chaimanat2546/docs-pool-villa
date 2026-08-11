import { env } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { signMediaUploadTicket } from "../../../src/lib/media/upload-ticket";
import worker from "../src";

const documentId = "11111111-1111-4111-8111-111111111111";
const mediaId = "22222222-2222-4222-8222-222222222222";
const objectKey = `docs/${documentId}/${mediaId}.webp`;
const webp = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32]);

async function request(overrides: { origin?: string; ticket?: string; body?: BodyInit; contentType?: string } = {}) {
  const ticket = overrides.ticket ?? await signMediaUploadTicket({ documentId, mediaId, objectKey, contentType: "image/webp", byteSize: webp.byteLength, expiresAt: Date.now() + 60_000 }, "test-docs-media-secret");
  return worker.fetch(new Request("https://media.example.test/uploads", {
    method: "PUT",
    headers: { Origin: overrides.origin ?? "http://localhost:3000", "Content-Type": overrides.contentType ?? "image/webp", "X-Docs-Media-Ticket": ticket },
    body: overrides.body ?? webp,
  }), env, createExecutionContext());
}

describe("Docs Media Worker", () => {
  it("rejects an upload from an unapproved origin", async () => {
    expect((await request({ origin: "https://attacker.example" })).status).toBe(403);
  });

  it("rejects a bad ticket and invalid image bytes", async () => {
    expect((await request({ ticket: "invalid" })).status).toBe(401);
    expect((await request({ body: new Uint8Array([1, 2, 3]) })).status).toBe(400);
  });

  it("stores a valid WebP only in the permitted docs key", async () => {
    const response = await request();
    expect(response.status).toBe(201);
    expect(await env.DOCS_MEDIA_BUCKET.head(objectKey)).not.toBeNull();
  });
});
