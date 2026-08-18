/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentEditor, ToolbarButton } from "./document-editor";
import { DocsParagraph, docsExtensions } from "./extensions";

const { preparePendingImage } = vi.hoisted(() => ({ preparePendingImage: vi.fn() }));

// Image decoding/conversion depends on createImageBitmap and canvas, which jsdom does not provide.
// The test keeps the actual toolbar click and file-input change flow while stubbing only that slow browser step.
vi.mock("./pending-images", () => ({ preparePendingImage }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setupEditorGeometry() {
  const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function preparedImage(file: File, id: string) {
  return {
    id,
    file,
    blob: new Blob([id], { type: "image/webp" }),
    previewUrl: `blob:${id}`,
    width: 800,
    height: 600,
    status: "ready" as const,
  };
}

describe("DocumentEditor paragraph indent", () => {
  it("keeps the line created by Enter independently indentable", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "beforeafter" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(7);
    editor.view.dom.focus();

    await user.keyboard("{Enter}{Tab}");

    expect(editor.getJSON().content).toEqual([
      expect.objectContaining({ attrs: { indentLevel: 0 }, content: [{ type: "text", text: "before" }] }),
      expect.objectContaining({ attrs: { indentLevel: 1 }, content: [{ type: "text", text: "after" }] }),
    ]);
    editor.destroy();
    editorMount.remove();
  });

  it("splits a legacy line break before indenting its following line", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "before" }, { type: "hardBreak" }, { type: "text", text: "after" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(8);
    editor.view.dom.focus();

    await user.keyboard("{Tab}");

    expect(editor.getJSON().content).toEqual([
      expect.objectContaining({ attrs: { indentLevel: 0 }, content: [{ type: "text", text: "before" }] }),
      expect.objectContaining({ attrs: { indentLevel: 1 }, content: [{ type: "text", text: "after" }] }),
    ]);
    editor.destroy();
    editorMount.remove();
  });

  it("increases a paragraph indent with Tab and limits it to level 3", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
    const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
    setupEditorGeometry();
    editor.focus();

    await user.keyboard("{Tab}{Tab}{Tab}{Tab}");

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 3 } })]),
    }), []));
  });

  it("decreases a paragraph indent with Shift+Tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 1 }, content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
    const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
    setupEditorGeometry();
    editor.focus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 0 } })]),
    }), []));
  });

  it("decreases a paragraph indent with Backspace only at the paragraph start", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "ข้อความ" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(1);
    editor.view.dom.focus();

    await user.keyboard("{Backspace}");

    expect(editor.getJSON().content?.[0]).toEqual(expect.objectContaining({
      type: "paragraph",
      attrs: { indentLevel: 1 },
      content: [{ type: "text", text: "ข้อความ" }],
    }));
    editor.destroy();
    editorMount.remove();
  });

  it("keeps normal Backspace behavior away from the paragraph start", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "ข้อความ" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(3);
    editor.view.dom.focus();

    await user.keyboard("{Backspace}");

    expect(editor.getJSON().content?.[0]).toEqual(expect.objectContaining({
      attrs: { indentLevel: 2 },
      content: [{ type: "text", text: "ขอความ" }],
    }));
    editor.destroy();
    editorMount.remove();
  });

  it("leaves an unindented paragraph unchanged when Backspace is pressed at its start", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความ" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(1);
    editor.view.dom.focus();

    await user.keyboard("{Backspace}");

    expect(editor.getJSON().content?.[0]).toEqual(expect.objectContaining({
      type: "paragraph",
      attrs: { indentLevel: 0 },
      content: [{ type: "text", text: "ข้อความ" }],
    }));
    editor.destroy();
    editorMount.remove();
  });

  it("does not add paragraph indentation to a heading when Backspace is pressed", async () => {
    const user = userEvent.setup();
    const editorMount = document.createElement("div");
    document.body.append(editorMount);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อ" }] }] },
    });
    setupEditorGeometry();
    editor.commands.setTextSelection(1);
    editor.view.dom.focus();

    await user.keyboard("{Backspace}");

    expect(editor.getJSON().content?.[0]).toEqual(expect.objectContaining({
      type: "heading",
      attrs: { level: 2 },
    }));
    editor.destroy();
    editorMount.remove();
  });

  it("lets Tab and Shift+Tab leave top-level paragraphs at their indent boundaries", async () => {
    const user = userEvent.setup();
    const previousControl = document.createElement("button");
    previousControl.textContent = "ก่อนหน้า";
    const editorMount = document.createElement("div");
    const nextControl = document.createElement("button");
    nextControl.textContent = "ถัดไป";
    document.body.append(previousControl, editorMount, nextControl);
    const editor = new Editor({
      element: editorMount,
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 3 }, content: [{ type: "text", text: "ย่อหน้าสูงสุด" }] }] },
    });
    setupEditorGeometry();

    editor.view.dom.focus();
    await user.keyboard("{Tab}");

    expect(document.activeElement).toBe(nextControl);
    expect(editor.getJSON().content?.[0]?.attrs?.indentLevel).toBe(3);

    editor.commands.updateAttributes("paragraph", { indentLevel: 0 });
    editor.view.dom.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");

    expect(document.activeElement).toBe(previousControl);
    expect(editor.getJSON().content?.[0]?.attrs?.indentLevel).toBe(0);
    editor.destroy();
    editorMount.remove();
    previousControl.remove();
    nextControl.remove();
  });

  it("does not indent a heading when Tab is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อ" }] }] }} onChange={onChange} />);
    const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
    setupEditorGeometry();
    editor.focus();

    await user.keyboard("{Tab}");

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "heading", attrs: { level: 2 } })]),
    }), []));
  });

  it("leaves list item indentation to the list shortcut", () => {
    const editor = new Editor({
      extensions: docsExtensions,
      content: { type: "doc", content: [{ type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "รายการแรก" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "รายการสอง" }] }] },
      ] }] },
    });
    let secondItemTextPosition = 0;
    editor.state.doc.descendants((node, position) => {
      if (node.text === "รายการสอง") secondItemTextPosition = position + 1;
    });
    editor.commands.setTextSelection(secondItemTextPosition);

    editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));

    expect(editor.getJSON()).toEqual(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({ type: "bulletList", content: [expect.objectContaining({
        type: "listItem",
        content: expect.arrayContaining([expect.objectContaining({ type: "bulletList" })]),
      })] })]),
    }));
    editor.destroy();
  });

  it("does not indent a paragraph inside a callout", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [{ type: "callout", attrs: { kind: "info" }, content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความ" }] }] }] }} onChange={onChange} />);
    const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
    setupEditorGeometry();
    editor.focus();

    await user.keyboard("{Tab}");

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      content: expect.arrayContaining([expect.objectContaining({
        type: "callout",
        content: [expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 0 } })],
      })]),
    }), []));
  });

  it("does not update either paragraph when Tab is pressed with a range selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentEditor content={{ type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "ย่อหน้าแรก" }] },
      { type: "paragraph", content: [{ type: "text", text: "ย่อหน้าสอง" }] },
    ] }} onChange={onChange} />);
    const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
    setupEditorGeometry();
    editor.focus();

    await user.keyboard("{Control>}{a}{/Control}{Tab}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("parses only integer paragraph indent levels from 1 through 3", () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ paragraph: false }), DocsParagraph],
      content: '<p data-indent-level="2.5">decimal</p><p data-indent-level="9">high</p><p data-indent-level="-1">low</p><p data-indent-level="3">valid</p>',
    });

    expect(editor.getJSON().content?.map((node) => node.attrs?.indentLevel)).toEqual([0, 0, 0, 3]);
    editor.destroy();
  });
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
      content: expect.arrayContaining([expect.objectContaining({ type: "callout", attrs: { kind: "info" }, content: [expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 0 }, content: [{ type: "text", text: "ข้อความสำคัญ" }] })] })]),
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

  it("keeps the formatting toolbar visible while editing long content", async () => {
    render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);

    const toolbar = await screen.findByRole("toolbar", { name: "เครื่องมือจัดรูปแบบ" });

    expect(toolbar.className).toContain("sticky");
    expect(toolbar.className).toContain("top-0");
  });

  it("marks YouTube embeds for responsive sizing", async () => {
    const view = render(
      <DocumentEditor
        content={{
          type: "doc",
          content: [
            {
              type: "youtube",
              attrs: { src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" },
            },
          ],
        }}
        onChange={() => {}}
      />,
    );

    await waitFor(() => expect(view.container.querySelector("iframe")).not.toBeNull());
    const iframe = view.container.querySelector("iframe");

    expect(iframe?.className).toContain("doc-youtube-responsive");
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

describe("DocumentEditor image preparation queue", () => {
  it("forwards every selected file and waits for Alt confirmation before preparing the next one", async () => {
    const user = userEvent.setup();
    const firstFile = new File(["first"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["second"], "second.png", { type: "image/png" });
    const first = deferred<ReturnType<typeof preparedImage>>();
    const second = deferred<ReturnType<typeof preparedImage>>();
    preparePendingImage
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const onPreparationChange = vi.fn();
    const view = render(
      <DocumentEditor
        content={{ type: "doc", content: [] }}
        onChange={() => {}}
        onPreparationChange={onPreparationChange}
      />,
    );

    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input?.multiple).toBe(true);
    await user.upload(input!, [firstFile, secondFile]);

    await waitFor(() => expect(preparePendingImage).toHaveBeenCalledTimes(1));
    expect(preparePendingImage.mock.calls[0]?.[0]).toBe(firstFile);
    expect((await screen.findByRole("status")).textContent).toContain("กำลังเตรียมรูป 1 จาก 2");

    first.resolve(preparedImage(firstFile, "first-ready"));
    const firstDialog = await screen.findByRole("dialog", { name: "คำอธิบายภาพ" });
    expect(firstDialog).not.toBeNull();
    expect(preparePendingImage).toHaveBeenCalledTimes(1);

    await user.type(screen.getByRole("textbox", { name: "Alt text" }), "รูปแรก");
    await user.click(screen.getByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(preparePendingImage).toHaveBeenCalledTimes(2));
    expect(preparePendingImage.mock.calls[1]?.[0]).toBe(secondFile);
    expect(screen.getByRole("status").textContent).toContain("กำลังเตรียมรูป 2 จาก 2");

    second.resolve(preparedImage(secondFile, "second-ready"));
    await screen.findByRole("dialog", { name: "คำอธิบายภาพ" });
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(onPreparationChange).toHaveBeenLastCalledWith(false));
  });

  it("adds every pasted image to the same FIFO queue", async () => {
    const user = userEvent.setup();
    const firstFile = new File(["first"], "paste-first.jpg", { type: "image/jpeg" });
    const ignoredText = new File(["text"], "notes.txt", { type: "text/plain" });
    const secondFile = new File(["second"], "paste-second.HEIC", { type: "" });
    const first = deferred<ReturnType<typeof preparedImage>>();
    const second = deferred<ReturnType<typeof preparedImage>>();
    preparePendingImage
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const view = render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);
    const editor = await waitFor(() => view.container.querySelector<HTMLElement>(".ProseMirror"));

    fireEvent.paste(editor!, {
      clipboardData: {
        files: [firstFile, ignoredText, secondFile],
        getData: () => "",
      },
    });

    await waitFor(() => expect(preparePendingImage).toHaveBeenCalledTimes(1));
    first.resolve(preparedImage(firstFile, "paste-first"));
    await screen.findByRole("dialog", { name: "คำอธิบายภาพ" });
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(preparePendingImage).toHaveBeenCalledTimes(2));
    expect(preparePendingImage.mock.calls.map((call) => call[0])).toEqual([
      firstFile,
      secondFile,
    ]);
    second.resolve(preparedImage(secondFile, "paste-second"));
  });

  it("shows retry and remove actions for a failed file without blocking the next file", async () => {
    const user = userEvent.setup();
    const broken = new File(["broken"], "broken.jpg", { type: "image/jpeg" });
    const next = new File(["next"], "next.png", { type: "image/png" });
    const nextResult = deferred<ReturnType<typeof preparedImage>>();
    preparePendingImage
      .mockRejectedValueOnce(new Error("อ่านรูปไม่ได้"))
      .mockImplementationOnce(() => nextResult.promise);
    const view = render(<DocumentEditor content={{ type: "doc", content: [] }} onChange={() => {}} />);
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [broken, next]);

    await waitFor(() => expect(preparePendingImage).toHaveBeenCalledTimes(2));
    expect(screen.getByText("broken.jpg")).not.toBeNull();
    expect(screen.getByText("อ่านรูปไม่ได้")).not.toBeNull();
    expect(screen.getByRole("button", { name: "ลองใหม่ broken.jpg" })).not.toBeNull();
    const remove = screen.getByRole("button", { name: "นำ broken.jpg ออก" });
    expect(screen.getByRole("status").textContent).toContain("กำลังเตรียมรูป 2 จาก 2");

    await user.click(remove);
    expect(screen.queryByText("broken.jpg")).toBeNull();
    nextResult.resolve(preparedImage(next, "next-ready"));
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
