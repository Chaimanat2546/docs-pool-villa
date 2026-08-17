import { afterEach, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error("not-found"); }),
  redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }),
}));
const requireAdmin = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => navigation);
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/media/content-media", () => ({
  collectPersistedMedia: () => ({ ok: true, references: [] }),
}));
vi.mock("@/lib/media/lifecycle", () => ({ readMediaOperation: vi.fn() }));
vi.mock("@/lib/server", () => ({ createClient }));
vi.mock("../document-form", () => ({ DocumentForm: () => null }));

import EditDocumentPage from "./page";

const documentId = "11111111-1111-4111-8111-111111111111";
const sectionId = "22222222-2222-4222-8222-222222222222";

function stubClient() {
  const document = {
    id: documentId,
    section_id: sectionId,
    title: "คู่มือเริ่มต้น",
    slug: "getting-started",
    excerpt: null,
    content: { type: "doc", content: [] },
    status: "draft",
    sort_order: 0,
    version: 1,
  };
  const sections = [{ id: sectionId, title: "เริ่มต้น", parent_id: null, sort_order: 0 }];
  const from = vi.fn((table: string) => {
    if (table === "doc_documents") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: document, error: null }) }) }) };
    }
    if (table === "doc_sections") {
      return { select: () => ({ order: () => ({ order: async () => ({ data: sections, error: null }) }) }) };
    }
    if (table === "doc_media") {
      return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  });
  createClient.mockResolvedValue({ from });
}

afterEach(() => {
  vi.clearAllMocks();
});

it("passes canonical section and review stage into the editor", async () => {
  stubClient();

  const result = await EditDocumentPage({
    params: Promise.resolve({ id: documentId }),
    searchParams: Promise.resolve({ section: sectionId, stage: "review" }),
  });

  expect(result.props.initialStage).toBe("review");
  expect(result.props.returnHref).toBe(`/admin/structure?section=${sectionId}`);
  expect(navigation.redirect).not.toHaveBeenCalled();
});

it.each([
  [{ section: "wrong", stage: "review" }, `/admin/documents/${documentId}?section=${sectionId}&stage=review`],
  [{ section: sectionId, stage: "invalid" }, `/admin/documents/${documentId}?section=${sectionId}&stage=content`],
  [{ section: sectionId }, `/admin/documents/${documentId}?section=${sectionId}&stage=content`],
])("redirects non-canonical query %j to %s", async (query, canonical) => {
  stubClient();

  await expect(EditDocumentPage({
    params: Promise.resolve({ id: documentId }),
    searchParams: Promise.resolve(query),
  })).rejects.toThrow(`redirect:${canonical}`);
  expect(navigation.redirect).toHaveBeenCalledWith(canonical);
});

it("treats repeated section and stage query values as non-canonical input", async () => {
  stubClient();
  const canonical = `/admin/documents/${documentId}?section=${sectionId}&stage=content`;

  await expect(EditDocumentPage({
    params: Promise.resolve({ id: documentId }),
    searchParams: Promise.resolve({ section: [sectionId, "other"], stage: ["review", "content"] }),
  })).rejects.toThrow(`redirect:${canonical}`);
  expect(navigation.redirect).toHaveBeenCalledWith(canonical);
});
