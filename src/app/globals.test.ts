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
  expect(stylesheet).toContain(".docs-editor-content p + p,\n.ProseMirror p + p,\n.docs-content p + p { margin-top: 0; }");
});
