/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import type { JSONContent } from "@tiptap/core";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentEditor, ToolbarButton } from "./document-editor";

const { preparePendingImage } = vi.hoisted(() => ({ preparePendingImage: vi.fn() }));

// Image decoding/conversion depends on createImageBitmap and canvas, which jsdom does not provide.
// The test keeps the actual toolbar click and file-input change flow while stubbing only that slow browser step.
vi.mock("./pending-images", () => ({ preparePendingImage }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentEditor accessibility", () => {
  it("styles quotes distinctly inside the editor", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toMatch(/\.docs-editor-content blockquote[\s\S]*border-left/);
  });

  it("styles code blocks distinctly inside the editor", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toMatch(/\.docs-editor-content pre[\s\S]*background/);
  });

  it("keeps the slash menu scrollable within the viewport", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toMatch(/\.docs-slash-menu[\s\S]*max-height[\s\S]*overflow-y/);
  });

  it("wraps existing text in an info callout from the toolbar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความสำคัญ" }] }] }} onChange={onChange} />);

    await screen.findByText("ข้อความสำคัญ");
    const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
    Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
    await user.click(screen.getByRole("button", { name: "กล่องข้อมูล" }));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "doc",
      content: expect.arrayContaining([expect.objectContaining({ type: "callout", attrs: { kind: "info" }, content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความสำคัญ" }] }] })]),
    }), []));
  });

  it("changes the current block to a level 2 heading from the toolbar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "หัวข้อ" }] }] }} onChange={onChange} />);
    const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
    Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });

    await user.click(await screen.findByRole("button", { name: "หัวข้อ 2" }));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "heading", attrs: { level: 2 } })]),
    }), []));
  });

  it("changes the current block to a level 3 heading from the toolbar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "หัวข้อย่อย" }] }] }} onChange={onChange} />);
    const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
    Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });

    await user.click(await screen.findByRole("button", { name: "หัวข้อ 3" }));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "heading", attrs: { level: 3 } })]),
    }), []));
  });

  it("does not expose table commands in the toolbar or slash menu", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    expect(await screen.findByRole("button", { name: "ตัวหนา" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "ตาราง" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ลิงก์" })).toBeNull();

    const editor = document.querySelector<HTMLElement>(".ProseMirror");
    expect(editor).not.toBeNull();
    editor!.focus();
    await user.keyboard("/");

    const slashMenu = await screen.findByRole("listbox");
    expect(within(slashMenu).queryByRole("option", { name: /^ตาราง/ })).toBeNull();
    expect((slashMenu as HTMLElement).style.top).not.toBe("");
    expect((slashMenu as HTMLElement).style.left).not.toBe("");
  });

  it("exposes labelled toolbar controls in keyboard tab order", async () => {
    const user = userEvent.setup();
    render(<div role="toolbar" aria-label="เครื่องมือจัดรูปแบบ"><ToolbarButton label="ตัวหนา" onClick={() => {}}>B</ToolbarButton></div>);

    expect(await screen.findByRole("toolbar", { name: "เครื่องมือจัดรูปแบบ" })).not.toBeNull();
    await user.tab();
    const boldButton = screen.getByRole("button", { name: "ตัวหนา" });
    expect(document.activeElement).toBe(boldButton);
    expect(boldButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("traps Tab and Shift+Tab focus for the YouTube dialog", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: "YouTube" });
    await user.click(trigger);

    const input = await screen.findByRole("textbox", { name: "URL" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const dialog = screen.getByRole("dialog");
    await user.tab();
    await user.tab();
    await user.tab();
    await waitFor(() => expect(document.activeElement).toBe(input));
    await user.tab({ shift: true });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("returns focus to the YouTube toolbar trigger after Escape closes its dialog", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: "YouTube" });
    await user.click(trigger);

    const input = await screen.findByRole("textbox", { name: "URL" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("returns focus to the image toolbar trigger after the real file-input change flow closes with Escape", async () => {
    const user = userEvent.setup();
    const image = new File(["image"], "preview.png", { type: "image/png" });
    preparePendingImage.mockResolvedValue({
      id: "pending-image",
      file: image,
      blob: new Blob(["webp"], { type: "image/webp" }),
      previewUrl: "blob:pending-image",
      width: 1,
      height: 1,
      status: "ready",
    });
    const view = render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: "เพิ่มรูป" });
    await user.click(trigger);
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(input!, image);

    const dialog = await screen.findByRole("dialog", { name: "คำอธิบายภาพ" });
    const altText = screen.getByRole("textbox", { name: "Alt text" });
    await waitFor(() => expect(document.activeElement).toBe(altText));
    await user.tab();
    await user.tab();
    await user.tab();
    await waitFor(() => expect(document.activeElement).toBe(altText));
    await user.tab({ shift: true });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("DocumentEditor persisted-content commit", () => {
  it("replaces the pending blob image when its committed content revision changes", async () => {
    const pending: JSONContent = {
      type: "doc", content: [{ type: "image", attrs: { src: "blob:pending-image", alt: "pending", pendingId: "pending-1" } }],
    };
    const persisted: JSONContent = {
      type: "doc", content: [{ type: "image", attrs: { src: "https://media.example.test/objects/docs/document/media.webp", alt: "pending", mediaId: "media-1" } }],
    };
    const onChange = () => {};
    const view = render(<DocumentEditor content={pending} contentRevision={0} onChange={onChange} />);

    expect((await screen.findByRole("img", { name: "pending" })).getAttribute("src")).toBe("blob:pending-image");
    view.rerender(<DocumentEditor content={persisted} contentRevision={1} onChange={onChange} />);

    expect((await screen.findByRole("img", { name: "pending" })).getAttribute("src")).toBe("https://media.example.test/objects/docs/document/media.webp");
  });
});
