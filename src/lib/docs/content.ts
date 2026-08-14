import type { JSONContent } from "@tiptap/core";

export type ContentValidationMode = "preview" | "persisted";

const allowedNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "blockquote",
  "codeBlock",
  "image",
  "youtube",
  "callout",
]);

const allowedMarks = new Set(["bold", "italic", "strike", "code", "link"]);
const allowedCalloutKinds = new Set(["info", "tip", "warning"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxContentBytes = 2 * 1024 * 1024;
const maxNodeCount = 20_000;
const maxDepth = 64;

const allowedChildren: Record<string, ReadonlySet<string>> = {
  doc: new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock", "image", "youtube", "callout"]),
  paragraph: new Set(["text", "hardBreak"]),
  heading: new Set(["text", "hardBreak"]),
  bulletList: new Set(["listItem"]),
  orderedList: new Set(["listItem"]),
  listItem: new Set(["paragraph", "bulletList", "orderedList", "blockquote", "codeBlock", "image", "youtube", "callout"]),
  blockquote: new Set(["paragraph", "heading", "bulletList", "orderedList", "codeBlock", "image", "youtube", "callout"]),
  codeBlock: new Set(["text", "hardBreak"]),
};

export type ContentValidationResult =
  | { ok: true; content: JSONContent }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function toYouTubeNoCookieUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      videoId = url.searchParams.get("v");
      if (!videoId && url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] ?? null;
      if (!videoId && url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] ?? null;
    }
    if (host === "youtube-nocookie.com" && url.protocol === "https:" && url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

function validateAttributes(node: Record<string, unknown>, mode: ContentValidationMode): string | null {
  const attrs = node.attrs;
  if (attrs === undefined) return null;
  if (!isRecord(attrs)) return "แอตทริบิวต์เนื้อหาไม่ถูกต้อง";

  switch (node.type) {
    case "heading":
      return attrs.level === 2 || attrs.level === 3 ? null : "รองรับเฉพาะ Heading 2 และ 3";
    case "link":
      return isAllowedLink(attrs.href) ? null : "ลิงก์ไม่ปลอดภัยหรือไม่รองรับ";
    case "image": {
      if (typeof attrs.src !== "string" || !attrs.src) return "รูปไม่มีแหล่งที่มา";
      if (typeof attrs.alt !== "string" || !attrs.alt.trim()) return "กรุณาระบุคำอธิบายภาพ";
      if (attrs.src.startsWith("blob:")) return mode === "preview" ? null : "ห้ามบันทึกรูปชั่วคราว";
      return (attrs.src.startsWith("https://") || attrs.src.startsWith("http://")) && typeof attrs.mediaId === "string" && uuidPattern.test(attrs.mediaId)
        ? null : "URL หรือรหัสรูปไม่ถูกต้อง";
    }
    case "youtube":
      return typeof attrs.src === "string" && toYouTubeNoCookieUrl(attrs.src)
        ? null
        : "รองรับเฉพาะวิดีโอ YouTube";
    case "callout":
      return typeof attrs.kind === "string" && allowedCalloutKinds.has(attrs.kind)
        ? null
        : "รูปแบบ Callout ไม่ถูกต้อง";
    default:
      return null;
  }
}

function validateNode(
  node: unknown,
  mode: ContentValidationMode,
  state: { depth: number; nodeCount: number },
  parentType: string | null,
): string | null {
  if (!isRecord(node) || typeof node.type !== "string" || !allowedNodes.has(node.type)) {
    return "พบชนิดเนื้อหาที่ไม่รองรับ";
  }
  if (parentType && !allowedChildren[parentType]?.has(node.type)) return "โครงสร้างเนื้อหาไม่ถูกต้อง";
  state.nodeCount += 1;
  if (state.nodeCount > maxNodeCount || state.depth > maxDepth) return "เนื้อหามีขนาดหรือความลึกเกินกำหนด";
  if (node.type === "text" && typeof node.text !== "string") return "ข้อความไม่ถูกต้อง";

  const attributeError = validateAttributes(node, mode);
  if (attributeError) return attributeError;

  if (node.marks !== undefined) {
    if (node.type !== "text") return "รูปแบบข้อความไม่ถูกต้อง";
    if (!Array.isArray(node.marks)) return "รูปแบบข้อความไม่ถูกต้อง";
    for (const mark of node.marks) {
      if (!isRecord(mark) || typeof mark.type !== "string" || !allowedMarks.has(mark.type)) {
        return "พบรูปแบบข้อความที่ไม่รองรับ";
      }
      if (mark.type === "link" && (!isRecord(mark.attrs) || !isAllowedLink(mark.attrs.href))) {
        return "ลิงก์ไม่ปลอดภัยหรือไม่รองรับ";
      }
    }
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return "โครงสร้างเนื้อหาไม่ถูกต้อง";
    if (!allowedChildren[node.type]) return "โครงสร้างเนื้อหาไม่ถูกต้อง";
    state.depth += 1;
    for (const child of node.content) {
      const error = validateNode(child, mode, state, node.type);
      if (error) {
        state.depth -= 1;
        return error;
      }
    }
    state.depth -= 1;
  }
  return null;
}

export function validateDocumentContent(value: unknown, mode: ContentValidationMode): ContentValidationResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { ok: false, error: "เนื้อหาไม่ถูกต้อง" };
  }
  if (new TextEncoder().encode(serialized).byteLength > maxContentBytes) {
    return { ok: false, error: "เนื้อหามีขนาดเกินกำหนด" };
  }
  const error = validateNode(value, mode, { depth: 0, nodeCount: 0 }, null);
  if (error) return { ok: false, error };
  if (!isRecord(value) || value.type !== "doc") return { ok: false, error: "เนื้อหาต้องเริ่มต้นด้วยเอกสาร" };
  return { ok: true, content: value as JSONContent };
}
