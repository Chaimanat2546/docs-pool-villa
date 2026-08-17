"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function HardDeleteDialog({
  title,
  targetName,
  files,
  onConfirm,
  pending = false,
  disabled = false,
}: {
  title: string;
  targetName: string;
  files: string[];
  onConfirm: () => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  const [confirmation, setConfirmation] = useState("");
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) setConfirmation("");
      }}
    >
      <Dialog.Trigger
        disabled={disabled}
        className="gap-2 cursor-pointer inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 border border-destructive/10"
      >
        <Trash2 className=" size-4"/>
        {title}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            การลบเป็นแบบถาวร ไม่มีการกู้คืน ระบบจะลบรูปจาก R2 ก่อนลบข้อมูล
          </Dialog.Description>
          {files.length > 0 && (
            <ul aria-label="รูปที่จะลบ" className="mt-3 list-disc pl-5 text-sm">
              {files.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          )}
          <label
            className="mt-5 block text-sm font-medium"
            htmlFor="confirm-hard-delete"
          >
            พิมพ์ “{targetName}” เพื่อยืนยัน
          </label>
          <input
            id="confirm-hard-delete"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border bg-background px-3"
          />
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close className="min-h-10 rounded-full px-4 text-sm hover:bg-muted cursor-pointer">
              ยกเลิก
            </Dialog.Close>
            <button
              type="button"
              disabled={pending || confirmation !== targetName}
              onClick={onConfirm}
              className="min-h-10 rounded-full bg-destructive px-4 text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
            >
              {pending ? "กำลังลบ" : "ลบถาวร"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
