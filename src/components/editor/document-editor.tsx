"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Dialog } from "@base-ui/react/dialog";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Video,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { docsExtensions } from "./extensions";
import { preparePendingImage, type PendingImage } from "./pending-images";
import {
  useImagePreparationQueue,
  type ImagePreparationBatchEvent,
  type ImagePreparationQueueItem,
} from "./use-image-preparation-queue";
import { toYouTubeNoCookieUrl } from "@/lib/docs/content";

export type { ImagePreparationBatchEvent } from "./use-image-preparation-queue";

export type DocumentEditorProps = {
  content: JSONContent;
  /** Changes only after the parent has committed persisted content successfully. */
  contentRevision?: number;
  onChange: (content: JSONContent, pendingImages: PendingImage[]) => void;
  onPreparationChange?: (isPreparing: boolean) => void;
  onPreparationBatchChange?: (event: ImagePreparationBatchEvent) => void;
};

type EditorDialog = "image" | "youtube" | null;

export function DocumentEditor({
  content,
  contentRevision,
  onChange,
  onPreparationChange,
  onPreparationBatchChange,
}: DocumentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const imageTriggerRef = useRef<HTMLButtonElement>(null);
  const imageDialogHandle = useMemo(() => Dialog.createHandle(), []);
  const appliedContentRevisionRef = useRef(contentRevision);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const {
    items: preparationItems,
    isPreparing,
    enqueue,
    retry,
    remove,
    takeReady,
  } = useImagePreparationQueue({
    prepare: preparePendingImage,
    onBatchChange: onPreparationBatchChange,
  });
  const readyItem = preparationItems.find(
    (item) => item.status === "ready" && item.prepared,
  );
  const imageDraft = readyItem?.prepared
    ? { queueId: readyItem.id, image: readyItem.prepared }
    : null;
  const descriptionId = useId();
  const editor = useEditor({
    extensions: docsExtensions,
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "docs-editor-content",
        "aria-describedby": descriptionId,
      },
      handlePaste: (_view, event) => {
        const images = Array.from(event.clipboardData?.files ?? []).filter(
          isImageFile,
        );
        if (images.length === 0) return false;
        enqueue(images);
        return true;
      },
    },
    onUpdate: ({ editor: updatedEditor }) =>
      reconcilePendingImages(updatedEditor.getJSON()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            heading2: current.isActive("heading", { level: 2 }),
            heading3: current.isActive("heading", { level: 3 }),
            bulletList: current.isActive("bulletList"),
            orderedList: current.isActive("orderedList"),
            callout: current.isActive("callout"),
            codeBlock: current.isActive("codeBlock"),
          }
        : null,
  });
  const toolbarState = state ?? {
    bold: false,
    italic: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    callout: false,
    codeBlock: false,
  };

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);
  useEffect(() => {
    onPreparationChange?.(isPreparing);
  }, [isPreparing, onPreparationChange]);
  useEffect(() => {
    if (!readyItem?.prepared || dialog === "image") return;
    imageDialogHandle.open("editor-image-dialog-trigger");
  }, [dialog, imageDialogHandle, readyItem]);
  useEffect(
    () => () =>
      pendingImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      ),
    []
  );
  useEffect(() => {
    if (dialog) dialogInputRef.current?.focus();
  }, [dialog]);
  useEffect(() => {
    if (
      !editor ||
      contentRevision === undefined ||
      appliedContentRevisionRef.current === contentRevision
    )
      return;

    // Set the permanent source before revoking previews so the rendered image never
    // briefly points at a revoked blob URL. Suppressing onUpdate also avoids marking
    // a successful Save as a new unsaved edit.
    editor.commands.setContent(content, { emitUpdate: false });
    appliedContentRevisionRef.current = contentRevision;
    for (const image of pendingImagesRef.current)
      URL.revokeObjectURL(image.previewUrl);
    pendingImagesRef.current = [];
    setPendingImages([]);
  }, [content, contentRevision, editor]);

  function reconcilePendingImages(nextContent: JSONContent) {
    const pendingIds = new Set<string>();
    collectPendingImageIds(nextContent, pendingIds);
    const images = pendingImagesRef.current;
    const next = images.filter((image) => pendingIds.has(image.id));
    for (const removed of images) {
      if (!pendingIds.has(removed.id)) URL.revokeObjectURL(removed.previewUrl);
    }
    pendingImagesRef.current = next;
    if (next.length !== images.length) setPendingImages(next);
    onChange(nextContent, next);
  }

  function setDialogOpen(
    nextDialog: Exclude<EditorDialog, null>,
    open: boolean
  ) {
    if (!open) {
      closeDialog();
      return;
    }
    setDialogError(null);
    setDialogValue("");
    setDialog(nextDialog);
  }

  function closeDialog() {
    if (dialog === "image" && imageDraft) remove(imageDraft.queueId);
    setDialog(null);
    setDialogError(null);
  }

  function renderDialog(nextDialog: Exclude<EditorDialog, null>) {
    const isImage = nextDialog === "image";
    return (
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={dialogInputRef}
          finalFocus={isImage ? imageTriggerRef : true}
          className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-lg outline-none"
        >
          <Dialog.Title className="text-lg font-semibold">
            {isImage ? "คำอธิบายภาพ" : "เพิ่มวิดีโอ YouTube"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {isImage
              ? "ระบุคำอธิบายภาพสำหรับผู้อ่านหน้าจอ"
              : "รองรับ youtube.com หรือ youtu.be"}
          </Dialog.Description>
          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="editor-dialog-value"
          >
            {isImage ? "Alt text" : "URL"}
          </label>
          <input
            ref={dialogInputRef}
            id="editor-dialog-value"
            value={dialogValue}
            onChange={(event) => setDialogValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitDialog();
              }
            }}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          />
          {dialogError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {dialogError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border px-3 py-2 text-sm">
              ยกเลิก
            </Dialog.Close>
            <button
              type="button"
              onClick={submitDialog}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              ยืนยัน
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    );
  }

  function submitDialog() {
    if (!editor || !dialog) return;
    const value = dialogValue.trim();
    if (!value) {
      setDialogError("กรุณากรอกข้อมูล");
      return;
    }

    if (dialog === "image") {
      if (!imageDraft) {
        closeDialog();
        return;
      }
      const pending = imageDraft.image;
      const nextImages = [...pendingImagesRef.current, pending];
      pendingImagesRef.current = nextImages;
      setPendingImages(nextImages);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: pending.previewUrl,
            alt: value,
            pendingId: pending.id,
          },
        })
        .run();
      takeReady();
      setDialog(null);
      return;
    }

    const normalized = toYouTubeNoCookieUrl(value);
    if (!normalized) {
      setDialogError("รองรับเฉพาะลิงก์ youtube.com หรือ youtu.be");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({ type: "youtube", attrs: { src: normalized } })
      .run();
    setDialog(null);
  }

  if (!editor) return null;
  return (
    <section aria-label="ตัวแก้ไขเนื้อหา" className="rounded-xl border bg-card">
      <p id={descriptionId} className="sr-only">
        ใช้ Toolbar หรือพิมพ์เครื่องหมายทับเพื่อเพิ่มเนื้อหา
      </p>
      <div
        className="sticky top-0 z-20 flex flex-wrap gap-1 border-b bg-card/95 p-2 backdrop-blur"
        role="toolbar"
        aria-label="เครื่องมือจัดรูปแบบ"
      >
        <ToolbarButton
          label="ตัวหนา"
          active={toolbarState.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="ตัวเอียง"
          active={toolbarState.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="หัวข้อ 2"
          active={toolbarState.heading2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="หัวข้อ 3"
          active={toolbarState.heading3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="รายการหัวข้อ"
          active={toolbarState.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="รายการตัวเลข"
          active={toolbarState.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="กล่องข้อมูล"
          active={toolbarState.callout}
          onClick={() => editor.chain().focus().toggleWrap("callout").run()}
        >
          <Info size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={toolbarState.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={16} />
        </ToolbarButton>
        <Dialog.Root
          open={dialog === "youtube"}
          onOpenChange={(open) => setDialogOpen("youtube", open)}
        >
          <Dialog.Trigger
            aria-label="YouTube"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted"
          >
            <Video size={16} />
          </Dialog.Trigger>
          {renderDialog("youtube")}
        </Dialog.Root>
        <Dialog.Root
          open={dialog === "image"}
          onOpenChange={(open) => setDialogOpen("image", open)}
          handle={imageDialogHandle}
        >
          <Dialog.Trigger
            handle={imageDialogHandle}
            id="editor-image-dialog-trigger"
            ref={imageTriggerRef}
            aria-label="เพิ่มรูป"
            onClick={(event) => {
              event.preventBaseUIHandler();
              imageTriggerRef.current = event.currentTarget;
              fileInputRef.current?.click();
            }}
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted"
          >
            <ImagePlus size={16} />
          </Dialog.Trigger>
          {renderDialog("image")}
        </Dialog.Root>
        <ToolbarButton
          label="ย้อนกลับ"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="ทำซ้ำ"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(event) => {
          enqueue(event.target.files ?? []);
          event.currentTarget.value = "";
        }}
      />
      {preparationItems.length > 0 && (
        <ImagePreparationQueue
          items={preparationItems}
          onRetry={retry}
          onRemove={remove}
        />
      )}
      <EditorContent editor={editor} />
      {pendingImages.length > 0 && (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          รูป {pendingImages.length} รูปเก็บชั่วคราวในเบราว์เซอร์
          และจะยังไม่อัปโหลดจนกดบันทึก
        </p>
      )}
    </section>
  );
}

function ImagePreparationQueue({
  items,
  onRetry,
  onRemove,
}: {
  items: ImagePreparationQueueItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const current =
    items.find((item) => item.status === "converting") ??
    items.find((item) => item.status === "ready") ??
    items.find((item) => item.status === "pending");

  return (
    <section
      aria-label="คิวเตรียมรูป"
      className="m-3 rounded-lg border bg-muted/30 p-3"
    >
      {current && (
        <p role="status" className="text-sm font-medium">
          {current.status === "ready" ? "รอคำอธิบายรูป" : "กำลังเตรียมรูป"}{" "}
          {current.ordinal} จาก {current.total}
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-h-11 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{item.fileName}</p>
              {item.status === "pending" && (
                <p className="text-muted-foreground">รอเตรียมรูป</p>
              )}
              {item.status === "converting" && (
                <p className="text-muted-foreground">กำลังแปลงเป็น WebP</p>
              )}
              {item.status === "ready" && (
                <p className="text-muted-foreground">รอ Alt text</p>
              )}
              {item.status === "failed" && (
                <p className="text-destructive">{item.error}</p>
              )}
            </div>
            {item.status === "failed" && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`ลองใหม่ ${item.fileName}`}
                  onClick={() => onRetry(item.id)}
                  className="min-h-11 rounded-md border px-3 py-2"
                >
                  ลองใหม่
                </button>
                <button
                  type="button"
                  aria-label={`นำ ${item.fileName} ออก`}
                  onClick={() => onRemove(item.id)}
                  className="min-h-11 rounded-md border px-3 py-2 text-destructive"
                >
                  นำออก
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className=" cursor-pointer inline-flex size-10 items-center justify-center rounded-md hover:bg-muted aria-pressed:bg-muted"
    >
      {children}
    </button>
  );
}

function collectPendingImageIds(content: JSONContent, ids: Set<string>) {
  if (content.type === "image" && typeof content.attrs?.pendingId === "string")
    ids.add(content.attrs.pendingId);
  for (const child of content.content ?? []) collectPendingImageIds(child, ids);
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name)
  );
}
