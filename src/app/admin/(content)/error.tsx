"use client";

type ContentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ContentError({ reset }: ContentErrorProps) {
  return (
    <section
      role="alert"
      aria-labelledby="admin-content-error-title"
      className="min-w-0 p-4 sm:p-6"
    >
      <div className="rounded-xl border border-destructive/30 bg-card p-5 shadow-sm">
        <h1 id="admin-content-error-title" className="break-words text-xl font-semibold">
          โหลดพื้นที่จัดการเนื้อหาไม่สำเร็จ
        </h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">
          ข้อมูลเดิมยังไม่ถูกเปลี่ยนแปลง ลองโหลดรายการหมวดและเอกสารอีกครั้ง
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          ลองใหม่
        </button>
      </div>
    </section>
  );
}
