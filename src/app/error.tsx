"use client";

import Link from "next/link";

export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-24 text-center sm:px-6"><div className="w-full"><h1 className="text-3xl font-semibold">ไม่สามารถโหลดคู่มือได้</h1><p className="mt-4 text-muted-foreground">กรุณาลองใหม่อีกครั้งในภายหลัง</p><div className="mt-8 flex justify-center gap-3"><button type="button" onClick={retry} className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">ลองใหม่</button><Link href="/" className="inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium">กลับหน้าคู่มือ</Link></div></div></main>;
}
