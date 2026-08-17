"use client";

export default function SearchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><h1 className="text-3xl font-semibold">ค้นหาคู่มือ</h1><p role="alert" className="mt-3 text-muted-foreground">ไม่สามารถค้นหาคู่มือได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p><button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">ลองใหม่</button></main>;
}
