/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  retryMediaOperation: vi.fn(),
  rollbackUploadedMedia: vi.fn(),
  saveDocument: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn());
const bannerBehavior = vi.hoisted(() => ({ triggerRetryBeforeEffect: true }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock("./actions", () => actions);
vi.mock("@/app/admin/editor/actions", () => ({ createMediaUploadTicket: vi.fn() }));
vi.mock("@/components/editor/document-editor", () => ({
  DocumentEditor: ({ content }: { content: unknown }) => <output data-testid="editor-content">{JSON.stringify(content)}</output>,
}));
vi.mock("@/components/editor/editor-preview", () => ({ EditorPreview: () => null }));
vi.mock("@/components/admin/hard-delete-dialog", () => ({ HardDeleteDialog: () => null }));
vi.mock("@/components/admin/media-progress-list", () => ({ MediaProgressList: () => null }));
vi.mock("@/components/admin/media-operation-banner", async () => {
  const { useLayoutEffect } = await import("react");
  return {
    MediaOperationBanner: ({ onRetry }: { onRetry: () => void }) => {
      useLayoutEffect(() => {
        if (bannerBehavior.triggerRetryBeforeEffect) onRetry();
      }, [onRetry]);
      return <button type="button" onClick={onRetry}>Retry media operation</button>;
    },
  };
});

import { DocumentForm } from "./document-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  bannerBehavior.triggerRetryBeforeEffect = true;
});

it("does not dispatch a duplicate retry when a click precedes the automatic effect", async () => {
  actions.retryMediaOperation.mockReturnValue(new Promise(() => undefined));

  render(<DocumentForm
    document={{
      id: "11111111-1111-4111-8111-111111111111",
      sectionId: "22222222-2222-4222-8222-222222222222",
      title: "Pending document",
      slug: "pending-document",
      excerpt: null,
      content: { type: "doc", content: [] },
      status: "draft",
      sortOrder: 0,
      version: 1,
    }}
    sections={[{ id: "22222222-2222-4222-8222-222222222222", title: "Section", parentId: null, sortOrder: 0 }]}
    pendingOperation={{
      operationId: "33333333-3333-4333-8333-333333333333",
      kind: "save_remove",
      targetId: "11111111-1111-4111-8111-111111111111",
      files: ["old.webp"],
      attemptCount: 0,
      message: "กำลังรอลบรูปจาก R2",
    }}
  />);

  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(1));
});

it("releases the retry lock when the server action throws", async () => {
  bannerBehavior.triggerRetryBeforeEffect = false;
  actions.retryMediaOperation
    .mockRejectedValueOnce(new Error("media worker unavailable"))
    .mockResolvedValueOnce({ error: "retry failed" });

  const { getByRole } = render(<DocumentForm
    document={{
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      sectionId: "22222222-2222-4222-8222-222222222222",
      title: "Pending document",
      slug: "pending-document",
      excerpt: null,
      content: { type: "doc", content: [] },
      status: "draft",
      sortOrder: 0,
      version: 1,
    }}
    sections={[{ id: "22222222-2222-4222-8222-222222222222", title: "Section", parentId: null, sortOrder: 0 }]}
    pendingOperation={{
      operationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      kind: "save_remove",
      targetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      files: ["old.webp"],
      attemptCount: 0,
      message: "กำลังรอลบรูปจาก R2",
    }}
  />);

  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(1));
  fireEvent.click(getByRole("button", { name: "Retry media operation" }));
  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(2));
});

it("uses server-refreshed document fields and content after its version advances", async () => {
  const document = {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: "22222222-2222-4222-8222-222222222222",
    title: "Pending document",
    slug: "pending-document",
    excerpt: null,
    content: { type: "doc", content: [] },
    status: "draft" as const,
    sortOrder: 0,
    version: 1,
  };
  const sections = [{ id: "22222222-2222-4222-8222-222222222222", title: "Section", parentId: null, sortOrder: 0 }];
  const { container, rerender } = render(<DocumentForm key={`${document.id}:${document.version}`} document={document} sections={sections} />);

  const refreshedDocument = { ...document, title: "Finalized document", content: { type: "doc", content: [{ type: "paragraph" }] }, version: 2 };
  rerender(<DocumentForm key={`${refreshedDocument.id}:${refreshedDocument.version}`} document={refreshedDocument} sections={sections} />);

  await waitFor(() => {
    expect((within(container).getByRole("textbox", { name: "ชื่อเอกสาร" }) as HTMLInputElement).value).toBe("Finalized document");
    expect(within(container).getByTestId("editor-content").textContent).toContain('"paragraph"');
  });
});
