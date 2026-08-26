/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { MediaProgressList } from "./media-progress-list";

it("reports individual upload progress accessibly", () => {
  const file = new File(["image"], "guide.png", { type: "image/png" });
  render(<MediaProgressList images={[{ id: "one", fileName: file.name, blob: file, previewUrl: "blob:one", width: 1, height: 1, status: "uploading", progress: 50 }]} />);
  expect(screen.getByRole("status").textContent).toContain("50%");
  expect(screen.getByText("guide.png")).not.toBeNull();
});
