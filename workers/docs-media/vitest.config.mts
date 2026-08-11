import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.DOCS_MEDIA_UPLOAD_SECRET ??= "test-docs-media-secret";

export default defineConfig({
  test: { include: ["workers/docs-media/test/**/*.spec.ts"] },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: fileURLToPath(new URL("./wrangler.jsonc", import.meta.url)) },
      miniflare: { bindings: { DOCS_MEDIA_UPLOAD_SECRET: "test-docs-media-secret" } },
    }),
  ],
});
