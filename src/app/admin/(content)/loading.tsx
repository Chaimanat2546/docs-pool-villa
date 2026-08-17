export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="กำลังโหลดพื้นที่จัดการเนื้อหา"
      className="min-w-0 p-4 sm:p-6"
    >
      <span className="sr-only">กำลังโหลดพื้นที่จัดการเนื้อหา</span>
      <div className="h-8 w-48 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </section>
  );
}
