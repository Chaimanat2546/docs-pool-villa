import { Extension, Node, type Editor, type JSONContent, type Range } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import Youtube from "@tiptap/extension-youtube";
import StarterKit from "@tiptap/starter-kit";
import Suggestion from "@tiptap/suggestion";

import { toYouTubeNoCookieUrl } from "@/lib/docs/content";

export const DocsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      pendingId: { default: null, parseHTML: (element) => element.getAttribute("data-pending-id"), renderHTML: (attributes) => attributes.pendingId ? { "data-pending-id": attributes.pendingId } : {} },
      mediaId: { default: null, parseHTML: (element) => element.getAttribute("data-media-id"), renderHTML: (attributes) => attributes.mediaId ? { "data-media-id": attributes.mediaId } : {} },
    };
  },
});

export const DocsParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indentLevel: {
        default: 0,
        parseHTML: (element) => normalizeIndentLevel(element.getAttribute("data-indent-level")),
        renderHTML: (attributes) => {
          const indentLevel = normalizeIndentLevel(String(attributes.indentLevel));
          return indentLevel > 0 ? { "data-indent-level": indentLevel } : {};
        },
      },
    };
  },
  addKeyboardShortcuts() {
    const changeIndent = (delta: 1 | -1, requireParagraphStart = false) => {
      const { selection } = this.editor.state;
      const { $from } = selection;
      if (!selection.empty || $from.depth !== 1 || $from.parent.type.name !== "paragraph" || (requireParagraphStart && $from.parentOffset !== 0)) return false;
      const current = normalizeIndentLevel(String($from.parent.attrs.indentLevel));
      const next = Math.max(0, Math.min(3, current + delta));
      if (next === current) return false;
      if ($from.nodeBefore?.type.name === "hardBreak") {
        return this.editor.chain()
          .deleteRange({ from: $from.pos - 1, to: $from.pos })
          .splitBlock()
          .updateAttributes("paragraph", { indentLevel: next })
          .run();
      }
      return this.editor.commands.command(({ state, tr }) => {
        const { $from: currentPosition } = state.selection;
        tr.setNodeMarkup(currentPosition.before(), currentPosition.parent.type, { ...currentPosition.parent.attrs, indentLevel: next });
        return true;
      });
    };

    return {
      Tab: () => changeIndent(1),
      "Shift-Tab": () => changeIndent(-1),
      Backspace: () => changeIndent(-1, true),
    };
  },
});

function normalizeIndentLevel(value: string | null): number {
  const indentLevel = Number(value);
  return Number.isInteger(indentLevel) && indentLevel >= 1 && indentLevel <= 3 ? indentLevel : 0;
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { kind: { default: "info" } };
  },
  parseHTML() {
    return [{ tag: "aside[data-doc-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", { ...HTMLAttributes, "data-doc-callout": "true", class: `doc-callout doc-callout-${HTMLAttributes.kind ?? "info"}` }, 0];
  },
});

type SlashItem = { title: string; description: string; command: (props: { editor: Editor; range: Range }) => void };

const slashItems: SlashItem[] = [
  { title: "หัวข้อ 2", description: "เพิ่มหัวข้อหลัก", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
  { title: "หัวข้อ 3", description: "เพิ่มหัวข้อย่อย", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
  { title: "รายการหัวข้อ", description: "เพิ่ม Bullet list", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "รายการตัวเลข", description: "เพิ่ม Ordered list", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: "กล่องข้อมูล", description: "เพิ่ม Callout", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: "callout", attrs: { kind: "info" }, content: [{ type: "paragraph" }] }).run() },
  { title: "โค้ด", description: "เพิ่ม Code block", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
];

const SlashCommand = Extension.create({
  name: "docsSlashCommand",
  addProseMirrorPlugins() {
    return [Suggestion({
      editor: this.editor,
      char: "/",
      items: ({ query }) => slashItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 7),
      command: ({ editor, range, props }) => (props as SlashItem).command({ editor, range }),
      render: () => {
        let element: HTMLDivElement | null = null;
        let selectedIndex = 0;
        let currentItems: SlashItem[] = [];
        let selectItem: ((item: SlashItem) => void) | null = null;
        const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
          if (!element) return;
          const rect = clientRect?.();
          if (!rect) return;
          element.style.left = `${rect.left}px`;
          const gap = 8;
          const below = rect.bottom + gap;
          const above = rect.top - element.offsetHeight - gap;
          element.style.top = `${below + element.offsetHeight <= window.innerHeight - gap ? below : Math.max(gap, above)}px`;
        };
        const update = () => {
          if (!element) return;
          element.replaceChildren(...currentItems.map((item, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = index === selectedIndex ? "bg-muted" : "";
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", String(index === selectedIndex));
            button.textContent = `${item.title} — ${item.description}`;
            button.addEventListener("mousedown", (event) => {
              event.preventDefault();
              selectItem?.(item);
            });
            return button;
          }));
        };
        return {
          onStart: (props) => {
            element = document.createElement("div");
            element.className = "docs-slash-menu";
            element.setAttribute("role", "listbox");
            document.body.appendChild(element);
            currentItems = props.items as SlashItem[];
            selectItem = props.command as (item: SlashItem) => void;
            selectedIndex = 0;
            update();
            position(props.clientRect);
          },
          onUpdate: (props) => {
            currentItems = props.items as SlashItem[];
            selectItem = props.command as (item: SlashItem) => void;
            selectedIndex = 0;
            update();
            position(props.clientRect);
          },
          onKeyDown: (props) => {
            if (props.event.key === "ArrowUp" && currentItems.length > 0) { selectedIndex = (selectedIndex + currentItems.length - 1) % currentItems.length; update(); return true; }
            if (props.event.key === "ArrowDown" && currentItems.length > 0) { selectedIndex = (selectedIndex + 1) % currentItems.length; update(); return true; }
            if (props.event.key === "Enter" && currentItems[selectedIndex] && selectItem) { selectItem(currentItems[selectedIndex]); return true; }
            return false;
          },
          onExit: () => element?.remove(),
        };
      },
    })];
  },
});

export const docsExtensions = [
  StarterKit.configure({
    paragraph: false,
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      protocols: ["mailto"],
      isAllowedUri: (url, context) => context.defaultValidate(url) && /^(https?:|mailto:)/i.test(url),
    },
  }),
  DocsParagraph,
  DocsImage.configure({ HTMLAttributes: { class: "doc-image" } }),
  Youtube.configure({ nocookie: true, allowFullscreen: true, HTMLAttributes: { class: "doc-youtube doc-youtube-responsive" } }),
  Callout,
  SlashCommand,
];

export function normalizeYouTubeContent(content: JSONContent): JSONContent {
  if (content.type === "youtube" && typeof content.attrs?.src === "string") {
    const normalized = toYouTubeNoCookieUrl(content.attrs.src);
    return normalized ? { ...content, attrs: { ...content.attrs, src: normalized } } : content;
  }
  return content.content ? { ...content, content: content.content.map(normalizeYouTubeContent) } : content;
}
