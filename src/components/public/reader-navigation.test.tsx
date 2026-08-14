/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ReaderNavigation } from "./reader-navigation";

const sections = [{
  id: "section", parentId: null, title: "คู่มือ", slug: "guides", description: null, sortOrder: 1, children: [],
  documents: [{ id: "document", sectionId: "section", title: "เริ่มต้น", slug: "start", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/start", sectionTitle: "คู่มือ", parentTitle: null }],
}];

const nestedSections = [{
  id: "root", parentId: null, title: "คู่มือ", slug: "guides", description: null, sortOrder: 1,
  documents: [{ id: "root-document", sectionId: "root", title: "เริ่มต้น", slug: "start", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/start", sectionTitle: "คู่มือ", parentTitle: null }],
  children: [
    { id: "child-one", parentId: "root", title: "ตั้งค่า", slug: "configuration", description: null, sortOrder: 1, documents: [{ id: "child-one-document", sectionId: "child-one", title: "ตั้งค่าบัญชี", slug: "account", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/configuration/account", sectionTitle: "ตั้งค่า", parentTitle: "คู่มือ" }], children: [] },
    { id: "child-two", parentId: "root", title: "การใช้งาน", slug: "usage", description: null, sortOrder: 2, documents: [{ id: "child-two-document", sectionId: "child-two", title: "เริ่มใช้งาน", slug: "first-use", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/usage/first-use", sectionTitle: "การใช้งาน", parentTitle: "คู่มือ" }], children: [] },
  ],
}];

afterEach(cleanup);

describe("reader navigation", () => {
  it("keeps root documents visible and collapses child documents until expanded", async () => {
    const user = userEvent.setup();
    render(<ReaderNavigation currentPath="/guides/start" sections={nestedSections} toc={[]}><article>เนื้อหา</article></ReaderNavigation>);
    expect(screen.getByRole("link", { name: "เริ่มต้น" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "คู่มือ" })).toBeNull();
    const subsection = screen.getByRole("button", { name: "ตั้งค่า" });
    expect(subsection.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "ตั้งค่าบัญชี" })).toBeNull();
    await user.click(subsection);
    expect(subsection.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "ตั้งค่าบัญชี" })).not.toBeNull();
  });

  it("opens the active child section and preserves other expanded sections", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ReaderNavigation currentPath="/guides/start" sections={nestedSections} toc={[]}><article>เนื้อหา</article></ReaderNavigation>);
    rerender(<ReaderNavigation currentPath="/guides/configuration/account" sections={nestedSections} toc={[]}><article>เนื้อหา</article></ReaderNavigation>);
    expect(screen.getByRole("button", { name: "ตั้งค่า" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "ตั้งค่าบัญชี" }).getAttribute("aria-current")).toBe("page");
    const other = screen.getByRole("button", { name: "การใช้งาน" });
    await user.click(other);
    expect(other.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "ตั้งค่า" }).getAttribute("aria-expanded")).toBe("true");
  });

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
