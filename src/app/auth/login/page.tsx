import { SignInForm } from "./sign-in-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบผู้ดูแล</h1>
        <p className="mt-2 text-sm text-zinc-600">
          ใช้บัญชีที่ได้รับสิทธิ์จัดการเอกสาร Baan Pool Villa
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
