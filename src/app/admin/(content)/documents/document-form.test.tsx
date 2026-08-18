/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  retryMediaOperation: vi.fn(),
  rollbackUploadedMedia: vi.fn(),
  saveDocument: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const unsavedNavigation = vi.hoisted(() => ({
  registerDirty: vi.fn(),
  requestNavigation: vi.fn(),
}));
const toast = vi.hoisted(() => ({
  dismiss: vi.fn(),
  showError: vi.fn(),
  showLoading: vi.fn(() => "toast-1"),
  showSuccess: vi.fn(),
  update: vi.fn(),
}));
const bannerBehavior = vi.hoisted(() => ({ triggerRetryBeforeEffect: true }));
const pendingImages = vi.hoisted(() => ({ uploadPendingImage: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("./actions", () => actions);
vi.mock("@/app/admin/editor/actions", () => ({ createMediaUploadTicket: vi.fn() }));
vi.mock("@/components/admin/unsaved-navigation", () => ({
  useUnsavedNavigation: () => ({ dirty: false, ...unsavedNavigation }),
}));
vi.mock("@/components/admin/admin-toast", () => ({
  useAdminToast: () => toast,
}));
vi.mock("@/components/editor/pending-images", () => pendingImages);
vi.mock("@/components/editor/document-editor", () => ({
  DocumentEditor: ({ content, onChange, onPreparationChange, onPreparationBatchChange }: {
    content: unknown;
    onChange: (content: unknown, pendingImages: unknown[]) => void;
    onPreparationChange?: (isPreparing: boolean) => void;
    onPreparationBatchChange?: (event:
      | { status: "started"; total: number }
      | { status: "completed"; total: number; succeeded: number; failed: number }
    ) => void;
  }) => (
    <>
      <output data-testid="editor-content">{JSON.stringify(content)}</output>
      <button type="button" onClick={() => onChange({ type: "doc", content: [{ type: "paragraph" }] }, [])}>แก้ไขเนื้อหา</button>
      <button type="button" onClick={() => onPreparationChange?.(true)}>เริ่มเตรียมรูปจำลอง</button>
      <button type="button" onClick={() => onPreparationChange?.(false)}>เตรียมรูปจำลองเสร็จ</button>
      <button type="button" onClick={() => onPreparationBatchChange?.({ status: "started", total: 2 })}>เริ่มชุดเตรียมรูป</button>
      <button type="button" onClick={() => onPreparationBatchChange?.({ status: "completed", total: 2, succeeded: 2, failed: 0 })}>เตรียมรูปสำเร็จทั้งชุด</button>
      <button type="button" onClick={() => onPreparationBatchChange?.({ status: "completed", total: 2, succeeded: 1, failed: 1 })}>เตรียมรูปสำเร็จบางส่วน</button>
      <button type="button" onClick={() => onPreparationBatchChange?.({ status: "completed", total: 2, succeeded: 0, failed: 2 })}>เตรียมรูปไม่สำเร็จทั้งชุด</button>
      <button
        type="button"
        onClick={() => onChange(
          { type: "doc", content: [{ type: "paragraph" }] },
          [
            { id: "pending-1", file: new File(["one"], "one.webp", { type: "image/webp" }), blob: new Blob(["one"], { type: "image/webp" }), previewUrl: "blob:one", width: 1, height: 1, status: "ready" },
            { id: "pending-2", file: new File(["two"], "two.webp", { type: "image/webp" }), blob: new Blob(["two"], { type: "image/webp" }), previewUrl: "blob:two", width: 1, height: 1, status: "ready" },
          ],
        )}
      >
        เพิ่มรูปจำลอง
      </button>
    </>
  ),
}));
vi.mock("@/components/editor/editor-preview", () => ({
  EditorPreview: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="ตัวอย่างก่อนบันทึก" /> : null,
}));
vi.mock("@/components/admin/hard-delete-dialog", () => ({
  HardDeleteDialog: ({ title, onConfirm, disabled }: { title: string; onConfirm: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onConfirm}>{title}</button>
  ),
}));
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

import { DocumentForm, type DocumentRecord, type SectionOption } from "./document-form";

const rootSectionId = "22222222-2222-4222-8222-222222222222";
const childSectionId = "55555555-5555-4555-8555-555555555555";
const document: DocumentRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  sectionId: rootSectionId,
  title: "Pending document",
  slug: "pending-document",
  excerpt: null,
  content: { type: "doc", content: [] },
  status: "draft",
  sortOrder: 0,
  version: 1,
};
const sections: SectionOption[] = [
  { id: rootSectionId, title: "เริ่มต้น", parentId: null, sortOrder: 0 },
  { id: childSectionId, title: "การจอง", parentId: rootSectionId, sortOrder: 0 },
];
const returnHref = `/admin/structure?section=${rootSectionId}`;

function renderForm(options: {
  stage?: "content" | "review";
  pendingOperation?: {
    operationId: string;
    kind: "save_remove" | "document_delete";
    targetId: string;
    files: string[];
    attemptCount: number;
    message: string;
  } | null;
  record?: DocumentRecord;
} = {}) {
  return render(
    <DocumentForm
      document={options.record ?? document}
      sections={sections}
      initialStage={options.stage ?? "content"}
      returnHref={returnHref}
      pendingOperation={options.pendingOperation}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pendingImages.uploadPendingImage.mockReset();
  bannerBehavior.triggerRetryBeforeEffect = true;
});

it("saves content before advancing to review", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  await waitFor(() => expect(actions.saveDocument).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("heading", { name: "ตรวจและเผยแพร่" })).not.toBeNull();
  expect(navigation.replace).toHaveBeenCalledWith(`/admin/documents/${document.id}?section=${rootSectionId}&stage=review`);
});

it("updates one loading toast to success when saving content succeeds", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(toast.showLoading).toHaveBeenCalledWith("กำลังบันทึกเอกสาร");
  await waitFor(() => expect(toast.update).toHaveBeenCalledWith("toast-1", "success", "บันทึกเอกสารสำเร็จ"));
});

it("updates one image-batch toast to success after every upload and save succeeds", async () => {
  pendingImages.uploadPendingImage
    .mockResolvedValueOnce({ mediaId: "media-1", objectKey: "docs/media-1.webp", mimeType: "image/webp", sizeBytes: 3, width: 1, height: 1 })
    .mockResolvedValueOnce({ mediaId: "media-2", objectKey: "docs/media-2.webp", mimeType: "image/webp", sizeBytes: 3, width: 1, height: 1 });
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เพิ่มรูปจำลอง" }));
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(toast.showLoading).toHaveBeenCalledTimes(1);
  expect(toast.showLoading).toHaveBeenCalledWith(
    "กำลังอัปโหลดรูป 2 รูปและบันทึกเอกสาร",
  );
  await waitFor(() =>
    expect(toast.update).toHaveBeenCalledWith(
      "toast-1",
      "success",
      "บันทึกเอกสารสำเร็จ",
    ),
  );
});

it("blocks saving while the editor is preparing images", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เริ่มเตรียมรูปจำลอง" }));

  expect(screen.getByRole("alert").textContent).toBe(
    "กรุณารอให้เตรียมรูปเสร็จก่อนบันทึก",
  );
  expect(
    (screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(pendingImages.uploadPendingImage).not.toHaveBeenCalled();
  expect(actions.saveDocument).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(unsavedNavigation.registerDirty).toHaveBeenLastCalledWith(true),
  );
});

it.each([
  {
    completion: "เตรียมรูปสำเร็จทั้งชุด",
    kind: "success",
    message: "เตรียมรูปสำเร็จ 2 รูป",
  },
  {
    completion: "เตรียมรูปสำเร็จบางส่วน",
    kind: "warning",
    message: "เตรียมรูปสำเร็จ 1 จาก 2 รูป กรุณาตรวจรายการที่ไม่สำเร็จ",
  },
  {
    completion: "เตรียมรูปไม่สำเร็จทั้งชุด",
    kind: "error",
    message: "ไม่สามารถเตรียมรูปได้ กรุณาตรวจรายการและลองใหม่",
  },
])("uses one preparation-batch toast for the $kind outcome", async ({
  completion,
  kind,
  message,
}) => {
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เริ่มชุดเตรียมรูป" }));
  expect(toast.showLoading).toHaveBeenCalledOnce();
  expect(toast.showLoading).toHaveBeenCalledWith("กำลังเตรียมรูป 2 รูป");

  await user.click(screen.getByRole("button", { name: completion }));
  expect(toast.update).toHaveBeenCalledWith("toast-1", kind, message);
  expect(toast.showLoading).toHaveBeenCalledOnce();
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("updates one image-batch toast to warning when only some uploads succeed", async () => {
  pendingImages.uploadPendingImage
    .mockResolvedValueOnce({ mediaId: "media-1", objectKey: "docs/media-1.webp", mimeType: "image/webp", sizeBytes: 3, width: 1, height: 1 })
    .mockRejectedValueOnce(new Error("upload failed"));
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เพิ่มรูปจำลอง" }));
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(toast.showLoading).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(toast.update).toHaveBeenCalledWith(
      "toast-1",
      "warning",
      "อัปโหลดรูปสำเร็จ 1 จาก 2 รูป กรุณาลองบันทึกอีกครั้ง",
    ),
  );
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("updates one image-batch toast to error when no upload becomes ready", async () => {
  pendingImages.uploadPendingImage
    .mockRejectedValueOnce(new Error("first upload failed"))
    .mockRejectedValueOnce(new Error("second upload failed"));
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เพิ่มรูปจำลอง" }));
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(toast.showLoading).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(toast.update).toHaveBeenCalledWith(
      "toast-1",
      "error",
      "ไม่สามารถอัปโหลดรูปได้ กรุณาลองบันทึกอีกครั้ง",
    ),
  );
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("keeps content stage and values when save fails", async () => {
  actions.saveDocument.mockResolvedValue({ error: "Version conflict กรุณา Reload" });
  const user = userEvent.setup();
  renderForm();
  const title = screen.getByRole("textbox", { name: "ชื่อเอกสาร" });

  await user.clear(title);
  await user.type(title, "ชื่อที่ยังไม่บันทึก");
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("heading", { name: "เขียนเนื้อหา" })).not.toBeNull();
  expect((title as HTMLInputElement).value).toBe("ชื่อที่ยังไม่บันทึก");
  expect(navigation.replace).not.toHaveBeenCalled();
});

it("updates the same loading toast to error when saving content fails", async () => {
  actions.saveDocument.mockResolvedValue({ error: "Version conflict กรุณา Reload" });
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(toast.showLoading).toHaveBeenCalledWith("กำลังบันทึกเอกสาร");
  await waitFor(() => expect(toast.update).toHaveBeenCalledWith("toast-1", "error", "Version conflict กรุณา Reload"));
});

it("keeps the aggregate warning when uploaded-media rollback rejects", async () => {
  pendingImages.uploadPendingImage
    .mockResolvedValueOnce({ mediaId: "media-1", objectKey: "docs/media-1.webp", mimeType: "image/webp", sizeBytes: 3, width: 1, height: 1 })
    .mockRejectedValueOnce(new Error("upload failed"));
  actions.rollbackUploadedMedia.mockRejectedValue(new Error("rollback failed"));
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "เพิ่มรูปจำลอง" }));
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  await waitFor(() => expect(actions.rollbackUploadedMedia).toHaveBeenCalledOnce());
  await waitFor(() => expect(toast.update).toHaveBeenCalledWith(
    "toast-1",
    "warning",
    "อัปโหลดรูปสำเร็จ 1 จาก 2 รูป กรุณาลองบันทึกอีกครั้ง",
  ));
  expect(navigation.replace).not.toHaveBeenCalled();
});

it("shows inline field errors and focuses the first invalid field before saving", async () => {
  const user = userEvent.setup();
  renderForm();
  const title = screen.getByRole("textbox", { name: "ชื่อเอกสาร" });
  const slug = screen.getByRole("textbox", { name: "Slug" });

  await user.clear(title);
  await user.type(title, "   ");
  await user.clear(slug);
  await user.type(slug, "Invalid Slug");
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(screen.getByText("กรุณากรอกชื่อเอกสาร")).not.toBeNull();
  expect(screen.getByText("Slug ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น")).not.toBeNull();
  expect(title.getAttribute("aria-invalid")).toBe("true");
  expect(slug.getAttribute("aria-invalid")).toBe("true");
  expect(globalThis.document.activeElement).toBe(title);
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("submits valid staged fields through their semantic form", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  const orderedDocument = { ...document, sortOrder: 4 };
  renderForm({ record: orderedDocument });
  const title = screen.getByRole("textbox", { name: "ชื่อเอกสาร" });
  const submit = screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }) as HTMLButtonElement;

  expect(title.closest("form")).toBe(submit.closest("form"));
  expect(submit.type).toBe("submit");
  expect(screen.queryByRole("spinbutton", { name: "ลำดับ" })).toBeNull();
  title.focus();
  await user.keyboard("{Enter}");

  await waitFor(() => expect(actions.saveDocument).toHaveBeenCalledTimes(1));
  expect(actions.saveDocument).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: orderedDocument.sortOrder }));
});

it("chooses status in review and final save returns to the selected folder", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  renderForm({ stage: "review" });

  expect(screen.getByText("เริ่มต้น")).not.toBeNull();
  await user.selectOptions(screen.getByRole("combobox", { name: "สถานะ" }), "published");
  await user.click(screen.getByRole("button", { name: "บันทึกและกลับรายการ" }));

  await waitFor(() => expect(unsavedNavigation.requestNavigation).toHaveBeenCalledWith(returnHref));
  expect(actions.saveDocument).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
});

it("shows Thai status labels in the review selector", () => {
  renderForm({ stage: "review" });

  const status = screen.getByRole("combobox", { name: "สถานะ" });
  expect(within(status).getByRole("option", { name: "ฉบับร่าง" })).not.toBeNull();
  expect(within(status).getByRole("option", { name: "เผยแพร่" })).not.toBeNull();
  expect(within(status).getByRole("option", { name: "เก็บถาวร" })).not.toBeNull();
});

it("shows completed, current, and upcoming document steps", () => {
  const { container } = renderForm({ stage: "content" });
  const stepper = screen.getByRole("list", { name: "ขั้นตอนจัดทำเอกสาร" });

  expect(within(stepper).getByText("ข้อมูลเอกสาร").closest("li")?.dataset.state).toBe("completed");
  expect(within(stepper).getByText("เขียนเนื้อหา").closest("li")?.getAttribute("aria-current")).toBe("step");
  expect(within(stepper).getByText("สถานะเอกสาร").closest("li")?.dataset.state).toBe("upcoming");
  expect(container.querySelectorAll("[data-step-connector]")).toHaveLength(2);
});

it("keeps content actions visible while editing long documents", () => {
  renderForm();

  const saveButton = screen.getByRole("button", { name: "บันทึกและตรวจต่อ" });
  const actionBar = saveButton.parentElement;

  expect(actionBar?.className).toContain("sticky");
  expect(actionBar?.className).toContain("bottom-0");
  expect(actionBar?.className).toContain("sm:bottom-4");
});

it("marks the first two steps complete when reviewing", () => {
  renderForm({ stage: "review" });
  const stepper = screen.getByRole("list", { name: "ขั้นตอนจัดทำเอกสาร" });

  expect(within(stepper).getByText("ข้อมูลเอกสาร").closest("li")?.dataset.state).toBe("completed");
  expect(within(stepper).getByText("เขียนเนื้อหา").closest("li")?.dataset.state).toBe("completed");
  expect(within(stepper).getByText("สถานะเอกสาร").closest("li")?.getAttribute("aria-current")).toBe("step");
});

it("opens Preview from review before final save", async () => {
  const user = userEvent.setup();
  renderForm({ stage: "review" });

  await user.click(screen.getByRole("button", { name: "ดูตัวอย่าง" }));

  expect(screen.getByRole("dialog", { name: "ตัวอย่างก่อนบันทึก" })).not.toBeNull();
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("keeps long Thai section paths inside the responsive review pane with 44px actions", () => {
  const longSectionTitle = "การตั้งค่าการจองและการรับชำระเงินสำหรับผู้ดูแลที่มีชื่อหมวดยาวมาก";
  const view = render(
    <DocumentForm
      document={{ ...document, sectionId: childSectionId }}
      sections={[
        sections[0],
        { ...sections[1], title: longSectionTitle },
      ]}
      initialStage="review"
      returnHref={`/admin/structure?section=${childSectionId}`}
    />,
  );

  const main = view.container.querySelector("main");
  expect(main?.className).toContain("w-full");
  expect(screen.getByText(`เริ่มต้น › ${longSectionTitle}`).className).toContain("break-words");
  for (const name of ["ดูตัวอย่าง", "แก้ไขเนื้อหา", "ยกเลิก", "บันทึกและกลับรายการ"]) {
    expect(screen.getByRole("button", { name }).className).toContain("min-h-11");
  }
});

it("cancel keeps the saved draft and uses the unsaved guard", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

  expect(actions.deleteDocument).not.toHaveBeenCalled();
  expect(unsavedNavigation.requestNavigation).toHaveBeenCalledWith(returnHref);
});

it("moves the selected folder only after a successful content save", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  renderForm();

  await user.selectOptions(screen.getByRole("combobox", { name: "หมวด" }), childSectionId);
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));
  await screen.findByRole("heading", { name: "ตรวจและเผยแพร่" });
  await user.click(screen.getByRole("button", { name: "บันทึกและกลับรายการ" }));

  expect(navigation.replace).toHaveBeenCalledWith(`/admin/documents/${document.id}?section=${childSectionId}&stage=review`);
  expect(unsavedNavigation.requestNavigation).toHaveBeenCalledWith(`/admin/structure?section=${childSectionId}`);
});

it("keeps the original route context when a section move fails", async () => {
  actions.saveDocument.mockResolvedValue({ error: "ย้ายหมวดไม่สำเร็จ" });
  const user = userEvent.setup();
  renderForm();

  await user.selectOptions(screen.getByRole("combobox", { name: "หมวด" }), childSectionId);
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));

  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("heading", { name: "เขียนเนื้อหา" })).not.toBeNull();
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(unsavedNavigation.requestNavigation).not.toHaveBeenCalled();
});

it("blocks content and final transitions while a media operation is pending", async () => {
  bannerBehavior.triggerRetryBeforeEffect = false;
  const pendingOperation = {
    operationId: "33333333-3333-4333-8333-333333333333",
    kind: "save_remove" as const,
    targetId: document.id,
    files: ["old.webp"],
    attemptCount: 0,
    message: "กำลังรอลบรูปจาก R2",
  };
  const contentView = renderForm({ pendingOperation });

  expect((screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }) as HTMLButtonElement).disabled).toBe(true);
  contentView.unmount();
  renderForm({ stage: "review", pendingOperation });
  expect((screen.getByRole("button", { name: "บันทึกและกลับรายการ" }) as HTMLButtonElement).disabled).toBe(true);
  expect(actions.saveDocument).not.toHaveBeenCalled();
});

it("registers dirty state and clears it after a successful save and unmount", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  const view = renderForm();

  await user.clear(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }));
  await user.type(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }), "แก้ไขแล้ว");
  await waitFor(() => expect(unsavedNavigation.registerDirty).toHaveBeenLastCalledWith(true));
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));
  await waitFor(() => expect(unsavedNavigation.registerDirty).toHaveBeenLastCalledWith(false));

  view.unmount();
  expect(unsavedNavigation.registerDirty).toHaveBeenLastCalledWith(false);
});

it("returns to content without losing a review status choice", async () => {
  const user = userEvent.setup();
  renderForm({ stage: "review" });

  await user.selectOptions(screen.getByRole("combobox", { name: "สถานะ" }), "archived");
  await user.click(screen.getByRole("button", { name: "แก้ไขเนื้อหา" }));

  expect(screen.getByRole("heading", { name: "เขียนเนื้อหา" })).not.toBeNull();
  expect(navigation.replace).toHaveBeenCalledWith(`/admin/documents/${document.id}?section=${rootSectionId}&stage=content`);
});

it("keeps hard delete distinct and returns through the guarded destination", async () => {
  actions.deleteDocument.mockResolvedValue({ success: true, id: document.id, version: 1, path: "" });
  const user = userEvent.setup();
  renderForm({ stage: "review" });

  await user.click(screen.getByRole("button", { name: "ลบเอกสารถาวร" }));

  await waitFor(() => expect(actions.deleteDocument).toHaveBeenCalledWith(document.id, 1));
  expect(unsavedNavigation.requestNavigation).toHaveBeenCalledWith(returnHref);
});

it("does not dispatch a duplicate retry when a click precedes the automatic effect", async () => {
  actions.retryMediaOperation.mockReturnValue(new Promise(() => undefined));

  renderForm({
    pendingOperation: {
      operationId: "33333333-3333-4333-8333-333333333333",
      kind: "save_remove",
      targetId: document.id,
      files: ["old.webp"],
      attemptCount: 0,
      message: "กำลังรอลบรูปจาก R2",
    },
  });

  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(1));
});

it("returns to the selected folder when a retried document delete completes", async () => {
  bannerBehavior.triggerRetryBeforeEffect = false;
  let resolveRetry!: (result: { success: true; kind: "document_delete"; targetId: string }) => void;
  actions.retryMediaOperation.mockReturnValue(new Promise((resolve) => { resolveRetry = resolve; }));
  renderForm({
    pendingOperation: {
      operationId: "66666666-6666-4666-8666-666666666666",
      kind: "document_delete",
      targetId: document.id,
      files: ["old.webp"],
      attemptCount: 1,
      message: "กำลังรอลบรูปจาก R2",
    },
  });

  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(1));
  unsavedNavigation.registerDirty.mockClear();
  unsavedNavigation.requestNavigation.mockClear();
  navigation.refresh.mockClear();
  resolveRetry({ success: true, kind: "document_delete", targetId: document.id });

  await waitFor(() => expect(unsavedNavigation.requestNavigation).toHaveBeenCalledWith(returnHref));
  expect(unsavedNavigation.registerDirty).toHaveBeenCalledTimes(1);
  expect(unsavedNavigation.registerDirty).toHaveBeenCalledWith(false);
  expect(navigation.refresh).not.toHaveBeenCalled();
});

it("refreshes the editor when a retried save cleanup completes", async () => {
  bannerBehavior.triggerRetryBeforeEffect = false;
  actions.retryMediaOperation.mockResolvedValue({ success: true, kind: "save_remove", targetId: document.id, version: 2 });
  renderForm({
    pendingOperation: {
      operationId: "77777777-7777-4777-8777-777777777777",
      kind: "save_remove",
      targetId: document.id,
      files: ["old.webp"],
      attemptCount: 1,
      message: "กำลังรอลบรูปจาก R2",
    },
  });

  await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(1));
  expect(unsavedNavigation.requestNavigation).not.toHaveBeenCalled();
});

it("releases the retry lock when the server action throws", async () => {
  bannerBehavior.triggerRetryBeforeEffect = false;
  actions.retryMediaOperation
    .mockRejectedValueOnce(new Error("media worker unavailable"))
    .mockResolvedValueOnce({ error: "retry failed" });

  renderForm({
    pendingOperation: {
      operationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      kind: "save_remove",
      targetId: document.id,
      files: ["old.webp"],
      attemptCount: 0,
      message: "กำลังรอลบรูปจาก R2",
    },
  });

  fireEvent.click(screen.getByRole("button", { name: "Retry media operation" }));
  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Retry media operation" }));
  await waitFor(() => expect(actions.retryMediaOperation).toHaveBeenCalledTimes(2));
});

it("uses server-refreshed document fields and content after its version advances", async () => {
  const view = render(
    <DocumentForm key={`${document.id}:${document.version}`} document={document} sections={sections} initialStage="content" returnHref={returnHref} />,
  );
  const refreshedDocument = {
    ...document,
    title: "Finalized document",
    content: { type: "doc", content: [{ type: "paragraph" }] },
    version: 2,
  };

  view.rerender(
    <DocumentForm key={`${refreshedDocument.id}:${refreshedDocument.version}`} document={refreshedDocument} sections={sections} initialStage="content" returnHref={returnHref} />,
  );

  await waitFor(() => {
    expect((within(view.container).getByRole("textbox", { name: "ชื่อเอกสาร" }) as HTMLInputElement).value).toBe("Finalized document");
    expect(within(view.container).getByTestId("editor-content").textContent).toContain('"paragraph"');
  });
});
