import { revalidateTag } from "next/cache";

import { PUBLIC_DOCS_CACHE_TAG } from "@/lib/docs/public";

export function revalidatePublicDocs() {
  revalidateTag(PUBLIC_DOCS_CACHE_TAG, { expire: 0 });
}
