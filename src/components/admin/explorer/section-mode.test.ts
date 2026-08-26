import { expect, it } from "vitest";

import { sectionMode } from "./section-mode";

it("recognizes the single reorder URL mode", () => {
  expect(sectionMode("reorder")).toBe("reorder");
  expect(sectionMode("reorder-root")).toBe("view");
  expect(sectionMode("reorder-child")).toBe("view");
});
