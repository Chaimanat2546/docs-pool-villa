"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/client";

export function SignInForm({ initialErrorMessage }: { initialErrorMessage?: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorMessageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (errorMessage) {
      errorMessageRef.current?.focus();
    }
  }, [errorMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (error) {
        setErrorMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน");
        return;
      }

      // Route Handler redirects need a document navigation so Set-Cookie is applied immediately.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/auth/post-login");
    } catch {
      setErrorMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          อีเมล
        </label>
        <input
          className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          รหัสผ่าน
        </label>
        <input
          className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          required
        />
      </div>
      {errorMessage ? (
        <p
          className="text-sm text-red-700"
          ref={errorMessageRef}
          role="alert"
          tabIndex={-1}
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        className="h-10 w-full rounded-full bg-black px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
