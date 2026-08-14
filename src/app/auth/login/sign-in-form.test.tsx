/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInForm } from "./sign-in-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("SignInForm", () => {
  it("announces a generic credential error before the sign-in form", () => {
    render(
      <SignInForm initialErrorMessage="เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน" />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน",
    );
  });
});
