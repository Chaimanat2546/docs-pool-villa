/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/public/public-search-palette", () => ({
  PublicSearchPalette: () => <button type="button">ค้นหาคู่มือ</button>,
}));

import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("keeps the command palette trigger without rendering the legacy search link", () => {
    render(<PublicHeader />);

    expect(screen.getByRole("button", { name: "ค้นหาคู่มือ" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "ค้นหา" })).toBeNull();
  });
});
