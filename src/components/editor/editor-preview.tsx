import type { JSONContent } from "@tiptap/core";

import { DocumentContent } from "@/components/public/document-content";

export function EditorPreview({ content, open, onClose }: { content: JSONContent; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="editor-preview-title" className="mx-auto my-8 max-w-4xl rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 id="editor-preview-title" className="text-xl font-semibold">ตัวอย่างก่อนบันทึก</h2><button type="button" onClick={onClose} className="min-h-10 rounded-full border px-4 text-sm">ปิด</button></div>
        <div className="editor-preview-content"><DocumentContent content={content} /></div>
      </section>
    </div>
  );
}
