import { beforeEach, describe, expect, it, vi } from "vitest";

const { prepareAndDeleteSection } = vi.hoisted(() => ({ prepareAndDeleteSection: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/docs/public-cache", () => ({ revalidatePublicDocs: vi.fn() }));
vi.mock("@/lib/media/lifecycle", () => ({ prepareAndDeleteSection }));
vi.mock("@/lib/server", () => ({ createClient: vi.fn() }));

import { deleteSection } from "./actions";

const sectionId = "11111111-1111-4111-8111-111111111111";

describe("deleteSection", () => {
  beforeEach(() => prepareAndDeleteSection.mockReset());

  it("delegates a confirmed category deletion to the lifecycle owner", async () => {
    prepareAndDeleteSection.mockResolvedValue({ success: true, kind: "section_delete", targetId: sectionId });
    await expect(deleteSection(sectionId, "คู่มือ")).resolves.toEqual({ success: true });
    expect(prepareAndDeleteSection).toHaveBeenCalledWith(sectionId, "คู่มือ");
  });
});
