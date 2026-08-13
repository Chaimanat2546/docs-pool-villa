/** @vitest-environment jsdom */

import type { JSONContent } from "@tiptap/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DocumentEditor, ToolbarButton } from "./document-editor";

describe("DocumentEditor accessibility", () => {
  it("exposes labelled toolbar controls in keyboard tab order", async () => {
    const user = userEvent.setup();
    render(<div role="toolbar" aria-label="เครื่องมือจัดรูปแบบ"><ToolbarButton label="ตัวหนา" onClick={() => {}}>B</ToolbarButton></div>);

    expect(await screen.findByRole("toolbar", { name: "เครื่องมือจัดรูปแบบ" })).not.toBeNull();
    await user.tab();
    const boldButton = screen.getByRole("button", { name: "ตัวหนา" });
    expect(document.activeElement).toBe(boldButton);
    expect(boldButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("returns focus to the Link toolbar trigger after Escape closes its dialog", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const trigger = await screen.findByRole("button", { name: "ลิงก์" });
    await user.click(trigger);

    const input = await screen.findByRole("textbox", { name: "URL" });
    await waitFor(() => expect(document.activeElement).toBe(input));
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
