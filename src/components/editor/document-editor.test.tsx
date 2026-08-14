/** @vitest-environment jsdom */

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
  it("does not expose table commands in the toolbar or slash menu", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    expect(await screen.findByRole("button", { name: "ตัวหนา" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "ตาราง" })).toBeNull();

    const editor = document.querySelector<HTMLElement>(".ProseMirror");
    expect(editor).not.toBeNull();
    editor!.focus();
    await user.keyboard("/");

    const slashMenu = await screen.findByRole("listbox");
    expect(within(slashMenu).queryByRole("option", { name: /^ตาราง/ })).toBeNull();
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

  it.each(["ลิงก์", "YouTube"])("traps Tab and Shift+Tab focus for the %s dialog", async (triggerName) => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: triggerName });
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

  it.each(["ลิงก์", "YouTube"])("returns focus to the %s toolbar trigger after Escape closes its dialog", async (triggerName) => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: triggerName });
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
