import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">จัดการคู่มือ</h1>
      <p className="mt-3 text-zinc-600">
        พื้นที่จัดการเอกสารจะเริ่มพัฒนาใน Module ถัดไป
      </p>
    </main>
  );
}
