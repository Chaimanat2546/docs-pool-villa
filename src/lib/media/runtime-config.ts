import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

type DocsMediaRuntimeConfig = {
  workerUrl: string | undefined;
  secret: string | undefined;
  workerService: { fetch(request: Request): Promise<Response> } | undefined;
};

function readSecret(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readWorkerService(value: unknown): { fetch(request: Request): Promise<Response> } | undefined {
  return typeof value === "object" && value !== null && "fetch" in value && typeof value.fetch === "function"
    ? value as { fetch(request: Request): Promise<Response> }
    : undefined;
}

/**
 * Uses the Worker binding in deployed Cloudflare environments. The process
 * fallback keeps Next.js local development and unit tests independent of Wrangler.
 */
export async function getDocsMediaRuntimeConfig(): Promise<DocsMediaRuntimeConfig> {
  try {
    const context = await getCloudflareContext({ async: true });
    const secret = readSecret((context.env as { DOCS_MEDIA_UPLOAD_SECRET?: unknown }).DOCS_MEDIA_UPLOAD_SECRET);
    if (secret) {
      return {
        workerUrl: process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL,
        secret,
        workerService: readWorkerService((context.env as { DOCS_MEDIA?: unknown }).DOCS_MEDIA),
      };
    }
  } catch {
    // `next dev` and unit tests do not have a Cloudflare request context.
  }

  return {
    workerUrl: process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL,
    secret: readSecret(process.env.DOCS_MEDIA_UPLOAD_SECRET),
    workerService: undefined,
  };
}
