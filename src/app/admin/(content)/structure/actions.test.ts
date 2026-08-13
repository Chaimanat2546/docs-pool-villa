import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, prepareAndDeleteSection } = vi.hoisted(() => ({
  createClient: vi.fn(),
  prepareAndDeleteSection: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/docs/public-cache", () => ({ revalidatePublicDocs: vi.fn() }));
vi.mock("@/lib/media/lifecycle", () => ({ prepareAndDeleteSection }));
vi.mock("@/lib/server", () => ({ createClient }));

import { deleteSection, saveSection } from "./actions";

const sectionId = "11111111-1111-4111-8111-111111111111";
const childId = "22222222-2222-4222-8222-222222222222";

const createInput = {
  title: "การจอง",
  slug: "booking",
  description: "",
  parentId: sectionId,
  sortOrder: 0,
  isPublished: true,
};

describe("saveSection", () => {
  beforeEach(() => createClient.mockReset());

  it("returns the inserted section id", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: childId }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) });

    await expect(saveSection(createInput)).resolves.toEqual({ success: true, id: childId });
    expect(select).toHaveBeenCalledWith("id");
    expect(single).toHaveBeenCalledOnce();
  });

  it("returns the already validated id after updating a section", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) });

    await expect(saveSection({
      ...createInput,
      id: childId,
      title: "การจองใหม่",
      sortOrder: 1,
    })).resolves.toEqual({ success: true, id: childId });
    expect(eq).toHaveBeenCalledWith("id", childId);
  });

  it("fails safely when an insert returns no section row", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) });

    await expect(saveSection(createInput)).resolves.toEqual({
      error: "บันทึกหมวดไม่สำเร็จ กรุณาลองอีกครั้ง",
    });
  });
});

describe("deleteSection", () => {
  beforeEach(() => prepareAndDeleteSection.mockReset());

  it("delegates a confirmed category deletion to the lifecycle owner", async () => {
    prepareAndDeleteSection.mockResolvedValue({ success: true, kind: "section_delete", targetId: sectionId });
    await expect(deleteSection(sectionId, "คู่มือ")).resolves.toEqual({ success: true });
    expect(prepareAndDeleteSection).toHaveBeenCalledWith(sectionId, "คู่มือ");
  });
});
