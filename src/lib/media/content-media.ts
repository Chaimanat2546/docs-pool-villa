import type { JSONContent } from "@tiptap/core";

import type { UploadedPendingImage } from "@/components/editor/pending-images";

export type MediaReference = {
  mediaId: string;
  displayLabel: string;
};

export type MediaReferenceResult =
  | { ok: true; references: MediaReference[] }
  | { ok: false; error: string };

export type MediaDeleteItem = {
  documentId: string;
  objectKey: string;
  displayLabel: string;
};

export type MediaDeleteBatch = {
  documentId: string;
  objectKeys: string[];
  displayLabels: string[];
};

export function collectPersistedMedia(content: JSONContent): MediaReferenceResult {
  const references: MediaReference[] = [];
  const seenMediaIds = new Set<string>();

  const visit = (node: JSONContent) => {
    if (node.type === "image" && typeof node.attrs?.mediaId === "string") {
      if (seenMediaIds.has(node.attrs.mediaId)) throw new Error("พบรูปเดิมซ้ำในเอกสาร");
      seenMediaIds.add(node.attrs.mediaId);
      references.push({
        mediaId: node.attrs.mediaId,
        displayLabel: typeof node.attrs.alt === "string" && node.attrs.alt.trim()
          ? node.attrs.alt.trim()
          : `${node.attrs.mediaId}.webp`,
      });
    }

    for (const child of node.content ?? []) visit(child);
  };

  try {
    visit(content);
    return { ok: true, references };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ข้อมูลรูปไม่ถูกต้อง" };
  }
}

export function replacePendingImages(
  content: JSONContent,
  uploaded: Map<string, UploadedPendingImage>,
  publicUrlFor: (objectKey: string) => string,
): JSONContent {
  const visit = (node: JSONContent): JSONContent => {
    const attrs = node.attrs ? { ...node.attrs } : undefined;
    if (node.type === "image" && typeof attrs?.pendingId === "string") {
      const image = uploaded.get(attrs.pendingId);
      if (image) {
        delete attrs.pendingId;
        attrs.mediaId = image.mediaId;
        attrs.src = publicUrlFor(image.objectKey);
      }
    }

    return {
      ...node,
      ...(attrs ? { attrs } : {}),
      ...(node.content ? { content: node.content.map(visit) } : {}),
    };
  };

  return visit(content);
}

export function groupDeleteBatches(items: MediaDeleteItem[], maxKeys = 1000): MediaDeleteBatch[] {
  if (!Number.isInteger(maxKeys) || maxKeys < 1 || maxKeys > 1000) {
    throw new Error("จำนวนรูปต่อการลบต้องอยู่ระหว่าง 1 ถึง 1,000");
  }

  const byDocument = new Map<string, MediaDeleteItem[]>();
  for (const item of items) {
    const documentItems = byDocument.get(item.documentId) ?? [];
    documentItems.push(item);
    byDocument.set(item.documentId, documentItems);
  }

  return [...byDocument.entries()].flatMap(([documentId, documentItems]) => {
    const batches: MediaDeleteBatch[] = [];
    for (let index = 0; index < documentItems.length; index += maxKeys) {
      const batch = documentItems.slice(index, index + maxKeys);
      batches.push({
        documentId,
        objectKeys: batch.map((item) => item.objectKey),
        displayLabels: batch.map((item) => item.displayLabel),
      });
    }
    return batches;
  });
}
