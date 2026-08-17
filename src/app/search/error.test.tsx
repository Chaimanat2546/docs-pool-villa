// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SearchError from "./error";

describe("SearchError", () => {
  it("shows a safe retry message", () => {
    const reset = vi.fn();
    render(<SearchError error={new Error("database details")} reset={reset} />);
    expect(screen.getByRole("alert").textContent).toContain("ไม่สามารถค้นหาคู่มือได้ในขณะนี้");
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
