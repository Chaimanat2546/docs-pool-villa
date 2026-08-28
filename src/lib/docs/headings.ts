type ContentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
};

export type DocumentHeading = { id: string; level: 2 | 3; text: string };

function textFromNode(node: ContentNode): string {
  return node.text ?? node.content?.map(textFromNode).join("") ?? "";
}

function slugify(value: string) {
  const normalized = value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}

export function getDocumentHeadings(content: unknown): DocumentHeading[] {
  const root = content as ContentNode;
  const usedIds = new Map<string, number>();
  const headings: DocumentHeading[] = [];

  const visit = (node: ContentNode) => {
    if (node.type === "table") return;
    if (node.type === "heading" && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
      const text = textFromNode(node).trim();
      if (text) {
        const base = slugify(text);
        const count = usedIds.get(base) ?? 0;
        usedIds.set(base, count + 1);
        headings.push({ id: count ? `${base}-${count + 1}` : base, level: node.attrs.level, text });
      }
    }
    node.content?.forEach(visit);
  };

  visit(root);
  return headings;
}
