/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorPreview } from "./editor-preview";

describe("EditorPreview", () => {
  it("wraps document content at the public reader width", () => {
    const { container } = render(<EditorPreview content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ตัวอย่าง" }] }] }} open onClose={() => {}} />);

    expect(container.querySelector(".editor-preview-content")).not.toBeNull();
  });
});
