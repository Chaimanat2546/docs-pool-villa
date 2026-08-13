/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ReaderNavigation } from "./reader-navigation";

const sections = [{
  id: "section", parentId: null, title: "คู่มือ", slug: "guides", description: null, sortOrder: 1, children: [],
  documents: [{ id: "document", sectionId: "section", title: "เริ่มต้น", slug: "start", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/start", sectionTitle: "คู่มือ", parentTitle: null }],
}];

describe("reader navigation", () => {
  it("opens an accessible mobile drawer, exposes a mobile TOC, and returns focus after Escape", async () => {
    const user = userEvent.setup();
    render(<ReaderNavigation currentPath="/guides/start" sections={sections} toc={[{ id: "intro", level: 2, text: "บทนำ" }]}><article>เนื้อหา</article></ReaderNavigation>);
    expect(screen.getByText("หัวข้อในหน้านี้")).not.toBeNull();
    const trigger = screen.getByRole("button", { name: "เมนูคู่มือ" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "คู่มือ" })).not.toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "คู่มือ" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
