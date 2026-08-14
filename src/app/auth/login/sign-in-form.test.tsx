/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInForm } from "./sign-in-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("SignInForm", () => {
  it("announces the administrator-only denial before the sign-in form", () => {
    render(
      <SignInForm initialErrorMessage="บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล" />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล",
    );
  });
});
