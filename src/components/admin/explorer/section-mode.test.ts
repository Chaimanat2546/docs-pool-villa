import { expect, it } from "vitest";

import { sectionMode } from "./section-mode";

it("recognizes explicit root and child reorder URL modes", () => {
  expect(sectionMode("reorder-root")).toBe("reorder-root");
  expect(sectionMode("reorder-child")).toBe("reorder-child");
});
