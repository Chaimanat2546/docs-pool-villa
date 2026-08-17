import Link from "next/link";

import { PublicHeader } from "@/components/public/public-header";

export default function NotFound() {
  return <><PublicHeader /><main id="main-content" className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6"><p className="text-sm font-medium text-muted-foreground">404</p><h1 className="mt-3 text-3xl font-semibold">ไม่พบเอกสารที่ต้องการ</h1><p className="mt-4 text-muted-foreground">เอกสารอาจถูกย้าย ลบ หรือยังไม่ได้เผยแพร่</p><Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">กลับหน้าคู่มือ</Link></main></>;
}
