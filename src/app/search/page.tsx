import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = { title: "ค้นหาคู่มือ", robots: { index: false, follow: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 200) : "";
  return <><PublicHeader /><main id="main-content" className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><h1 className="text-3xl font-semibold">ค้นหาคู่มือ</h1><p className="mt-3 text-muted-foreground">{query ? `กำลังเตรียมการค้นหาสำหรับ “${query}”` : "พิมพ์คำที่ต้องการค้นหา"}</p><p className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">ผลการค้นหาจะเปิดใช้งานใน M07 พร้อมการค้นหาภาษาไทยและแสดงเฉพาะเอกสารที่เผยแพร่</p></main></>;
}
