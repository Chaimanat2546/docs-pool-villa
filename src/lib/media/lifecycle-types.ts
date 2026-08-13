export type MediaOperationKind = "save_remove" | "document_delete" | "section_delete";
export type MediaWorkKind = MediaOperationKind | "cleanup";

export type UploadedMediaCommand = {
  mediaId: string;
  objectKey: string;
  displayLabel: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

export type DocumentSaveCommand = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  expectedVersion: number | null;
  media: UploadedMediaCommand[];
};

export type MediaOperationView = {
  operationId: string;
  kind: MediaWorkKind;
  targetId: string;
  files: string[];
  attemptCount: number;
  message: string;
};

export type LifecycleResult =
  | { success: true; kind: MediaWorkKind; targetId: string; version?: number; path?: string }
  | { pending: true; operation: MediaOperationView }
  | { error: string; files?: string[] };

export type CleanupRetryResult =
  | { status: "complete" }
  | { status: "pending"; remaining: MediaOperationView[] }
  | { status: "error"; error: string };
