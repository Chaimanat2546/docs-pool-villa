/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToolbarButton } from "./document-editor";

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
});
