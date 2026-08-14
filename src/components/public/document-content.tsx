import { Fragment, type ReactNode } from "react";

type ContentMark = { type?: string; attrs?: { href?: unknown } };
type ContentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ContentMark[];
  content?: ContentNode[];
};

export type TocItem = { id: string; level: 2 | 3; text: string };

function textFromNode(node: ContentNode): string {
  return node.text ?? node.content?.map(textFromNode).join("") ?? "";
}

function slugify(value: string) {
  const normalized = value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}

export function getTableOfContents(content: unknown): TocItem[] {
  const root = content as ContentNode;
  const usedIds = new Map<string, number>();
  const headings: TocItem[] = [];
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

function isSafeHref(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function withMarks(children: ReactNode, marks: ContentMark[] | undefined): ReactNode {
  return marks?.reduce<ReactNode>((result, mark, index) => {
    const key = `${mark.type ?? "mark"}-${index}`;
    if (mark.type === "bold") return <strong key={key}>{result}</strong>;
    if (mark.type === "italic") return <em key={key}>{result}</em>;
    if (mark.type === "strike") return <s key={key}>{result}</s>;
    if (mark.type === "code") return <code key={key}>{result}</code>;
    if (mark.type === "link" && isSafeHref(mark.attrs?.href)) {
      const external = mark.attrs.href.startsWith("http");
      return <a key={key} href={mark.attrs.href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{result}</a>;
    }
    return result;
  }, children) ?? children;
}

function renderNode(node: ContentNode, headingIds: TocItem[], headingIndex: { value: number }): ReactNode {
  if (node.type === "table") return null;
  const children = node.content?.map((child, index) => <Fragment key={index}>{renderNode(child, headingIds, headingIndex)}</Fragment>) ?? [];
  switch (node.type) {
    case "text": return withMarks(node.text ?? "", node.marks);
    case "hardBreak": return <br />;
    case "paragraph": return <p>{children}</p>;
    case "heading": {
      const item = headingIds[headingIndex.value++];
      return node.attrs?.level === 3 ? <h3 id={item?.id}>{children}</h3> : <h2 id={item?.id}>{children}</h2>;
    }
    case "bulletList": return <ul>{children}</ul>;
    case "orderedList": return <ol>{children}</ol>;
    case "listItem": return <li>{children}</li>;
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "codeBlock": return <pre><code>{children}</code></pre>;
    case "callout": return <aside className={`doc-callout doc-callout-${node.attrs?.kind === "warning" ? "warning" : node.attrs?.kind === "tip" ? "tip" : "info"}`}>{children}</aside>;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      // R2 URLs are document-specific and are not configured as a Next image optimization remote pattern.
      // eslint-disable-next-line @next/next/no-img-element
      return src && alt ? <img className="doc-image" src={src} alt={alt} loading="lazy" /> : null;
    }
    case "youtube": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      return src.startsWith("https://www.youtube-nocookie.com/embed/")
        ? <div className="doc-video"><iframe src={src} title="วิดีโอ YouTube" loading="lazy" allowFullScreen /></div>
        : null;
    }
    default: return children;
  }
}

export function DocumentContent({ content }: { content: unknown }) {
  const root = content as ContentNode;
  const toc = getTableOfContents(content);
  if (!root || root.type !== "doc" || !Array.isArray(root.content)) return null;
  const headingIndex = { value: 0 };
  return <div className="docs-content">{root.content.map((node, index) => <Fragment key={index}>{renderNode(node, toc, headingIndex)}</Fragment>)}</div>;
}
