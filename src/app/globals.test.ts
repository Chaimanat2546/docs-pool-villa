import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

const stylesheet = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

it("indents only the first line of persisted paragraphs", () => {
  expect(stylesheet).toContain('.docs-content p[data-indent-level="1"] { text-indent: 2rem; }');
  expect(stylesheet).toContain('.docs-content p[data-indent-level="2"] { text-indent: 4rem; }');
  expect(stylesheet).toContain('.docs-content p[data-indent-level="3"] { text-indent: 6rem; }');
  expect(stylesheet).not.toContain('.docs-content p[data-indent-level="1"] { margin-left: 2rem; }');
});

it("renders consecutive ordinary paragraphs as simple line breaks", () => {
  expect(stylesheet.replace(/\r\n/g, "\n")).toContain(".docs-editor-content p + p,\n.ProseMirror p + p,\n.docs-content p + p { margin-top: 0; }");
});

it("uses the reader typography and spacing rules while editing", () => {
  const normalized = stylesheet.replace(/\r\n/g, "\n");

  expect(normalized).toContain(".docs-editor-content { width: 100%; max-width: 44.5rem; }");
  expect(normalized).toContain(".editor-preview-content { width: 100%; max-width: 42rem; }");
  expect(normalized).toContain(".docs-content,\n.docs-editor-content,\n.ProseMirror { font-size: 1rem; line-height: 1.75; }");
  expect(normalized).toContain(".docs-content > * + *,\n.docs-editor-content > * + *,\n.ProseMirror > * + * { margin-top: 1.25rem; }");
  expect(normalized).toContain(".docs-content h2,\n.docs-editor-content h2,\n.ProseMirror h2 { margin-top: 3rem; font-size: 1.75rem; line-height: 1.3; font-weight: 600; }");
});
