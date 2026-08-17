"use client";

import { ChevronRight, Folder } from "lucide-react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

export type FolderTreeProps = {
  sections: AdminExplorerSection[];
  selectedSectionId: string | null;
  onNavigate: (href: string) => void;
  creationBlocked?: boolean;
};

type VisibleTreeNode = {
  key: string;
  sectionId: string | null;
  title: string;
  count: number;
  level: number;
  parentKey: string | null;
  childKeys: string[];
};

function sectionKey(sectionId: string): string {
  return `section:${sectionId}`;
}

function sectionHref(sectionId: string | null): string {
  return sectionId ? `/admin/structure?section=${encodeURIComponent(sectionId)}` : "/admin/structure";
}

function initialExpandedKeys(sections: AdminExplorerSection[], selectedSectionId: string | null): Set<string> {
  const expanded = new Set<string>();
  const selected = sections.find((section) => section.id === selectedSectionId);
  if (selected?.parentId) expanded.add(sectionKey(selected.parentId));
  return expanded;
}

export function FolderTree({ sections, selectedSectionId, onNavigate, creationBlocked = false }: FolderTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState(() => initialExpandedKeys(sections, selectedSectionId));
  const [focusedKey, setFocusedKey] = useState<string | null>(() => selectedSectionId
    ? sectionKey(selectedSectionId)
    : sections.find((section) => section.parentId === null)?.id ? sectionKey(sections.find((section) => section.parentId === null)!.id) : null);
  const [previousSelectedSectionId, setPreviousSelectedSectionId] = useState(selectedSectionId);
  const [treeHasFocus, setTreeHasFocus] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  const childSectionsByParent = useMemo(() => {
    const result = new Map<string | null, AdminExplorerSection[]>();
    for (const section of sections) {
      const siblings = result.get(section.parentId) ?? [];
      siblings.push(section);
      result.set(section.parentId, siblings);
    }
    return result;
  }, [sections]);

  if (selectedSectionId !== previousSelectedSectionId) {
    setPreviousSelectedSectionId(selectedSectionId);
    const selected = sections.find((section) => section.id === selectedSectionId);
    if (selected?.parentId) {
      const parentKey = sectionKey(selected.parentId);
      if (!expandedKeys.has(parentKey)) setExpandedKeys(new Set([...expandedKeys, parentKey]));
    }
  }

  const visibleNodes = useMemo(() => {
    const rootSections = childSectionsByParent.get(null) ?? [];
    const nodes: VisibleTreeNode[] = [];

    for (const rootSection of rootSections) {
      const rootKey = sectionKey(rootSection.id);
      const childSections = childSectionsByParent.get(rootSection.id) ?? [];
      nodes.push({
        key: rootKey,
        sectionId: rootSection.id,
        title: rootSection.title,
        count: rootSection.directDocumentCount,
        level: 1,
        parentKey: null,
        childKeys: childSections.map((section) => sectionKey(section.id)),
      });

      if (!expandedKeys.has(rootKey)) continue;
      for (const childSection of childSections) {
        nodes.push({
          key: sectionKey(childSection.id),
          sectionId: childSection.id,
          title: childSection.title,
          count: childSection.directDocumentCount,
          level: 2,
          parentKey: rootKey,
          childKeys: [],
        });
      }
    }

    return nodes;
  }, [childSectionsByParent, expandedKeys]);

  const focusedNodeIsVisible = visibleNodes.some((node) => node.key === focusedKey);
  const requestedSelectedKey = selectedSectionId ? sectionKey(selectedSectionId) : null;
  const selectedKey = visibleNodes.some((node) => node.key === requestedSelectedKey)
    ? requestedSelectedKey
    : visibleNodes[0]?.key ?? null;
  const selectedNodeIsVisible = visibleNodes.some((node) => node.key === selectedKey);
  const reconciledFocusedKey = focusedNodeIsVisible ? focusedKey : selectedNodeIsVisible ? selectedKey : null;
  const shouldRestoreTreeFocus = !focusedNodeIsVisible && treeHasFocus;
  const creationBlockMessage = "กำลังจัดการรูปภาพที่ค้างอยู่";
  const totalDocumentCount = sections.reduce((total, section) => total + section.directDocumentCount, 0);

  useLayoutEffect(() => {
    if (shouldRestoreTreeFocus && reconciledFocusedKey) itemRefs.current.get(reconciledFocusedKey)?.focus();
  }, [reconciledFocusedKey, shouldRestoreTreeFocus]);

  function focusNode(key: string) {
    setFocusedKey(key);
    itemRefs.current.get(key)?.focus();
  }

  function setExpanded(key: string, expanded: boolean) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (expanded) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>, node: VisibleTreeNode, index: number) {
    const canExpand = node.parentKey === null || node.childKeys.length > 0;
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        onNavigate(sectionHref(node.sectionId));
        return;
      case "ArrowRight":
        if (!canExpand) return;
        event.preventDefault();
        if (!expandedKeys.has(node.key)) setExpanded(node.key, true);
        else if (node.childKeys.length > 0) focusNode(node.childKeys[0]);
        return;
      case "ArrowLeft":
        if (canExpand && expandedKeys.has(node.key)) {
          event.preventDefault();
          setExpanded(node.key, false);
        } else if (node.parentKey) {
          event.preventDefault();
          focusNode(node.parentKey);
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        focusNode(visibleNodes[Math.min(index + 1, visibleNodes.length - 1)].key);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusNode(visibleNodes[Math.max(index - 1, 0)].key);
        return;
      case "Home":
        event.preventDefault();
        focusNode(visibleNodes[0].key);
        return;
      case "End":
        event.preventDefault();
        focusNode(visibleNodes.at(-1)!.key);
    }
  }

  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-sm font-medium text-muted-foreground">คู่มือทั้งหมด</p>
      <div
        role="tree"
        aria-label="หมวดคู่มือ"
        className="space-y-1"
        onFocusCapture={() => setTreeHasFocus(true)}
        onBlurCapture={(event) => setTreeHasFocus(event.currentTarget.contains(event.relatedTarget as Node | null))}
      >
      {visibleNodes.map((node, index) => {
        const hasChildren = node.childKeys.length > 0;
        const canExpand = node.parentKey === null || hasChildren;
        const isExpanded = canExpand && expandedKeys.has(node.key);
        const isSelected = node.sectionId === selectedSectionId;
        const Icon = Folder;
        const nextNode = visibleNodes[index + 1];
        const creationRoot = node.parentKey === null && isExpanded && !hasChildren
          ? node
          : node.level === 2 && nextNode?.parentKey !== node.parentKey
            ? visibleNodes.find((candidate) => candidate.key === node.parentKey)
            : null;

        return (
          <Fragment key={node.key}>
            <div
              ref={(element) => {
                if (element) itemRefs.current.set(node.key, element);
                else itemRefs.current.delete(node.key);
              }}
              role="treeitem"
              aria-level={node.level}
              aria-selected={isSelected}
              aria-expanded={canExpand ? isExpanded : undefined}
              aria-label={`${node.title} ${node.count} เอกสาร`}
              tabIndex={reconciledFocusedKey === node.key ? 0 : -1}
              onFocus={() => setFocusedKey(node.key)}
              onClick={() => onNavigate(sectionHref(node.sectionId))}
              onKeyDown={(event) => handleKeyDown(event, node, index)}
              className={`flex min-h-11 w-full cursor-pointer select-none items-center gap-1 rounded-md pr-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-muted aria-selected:font-medium aria-selected:shadow-[inset_3px_0_0_hsl(var(--primary))] ${node.level === 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}
              style={{ paddingInlineStart: `${12 + (node.level - 1) * 16}px` }}
            >
              {canExpand ? (
                <span
                  data-tree-disclosure
                  aria-hidden="true"
                  title={`${isExpanded ? "ยุบ" : "ขยาย"}หมวด ${node.title}`}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    setExpanded(node.key, !isExpanded);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
                >
                  <ChevronRight className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} aria-hidden="true" />
                </span>
              ) : (
                <span className="w-11 shrink-0" aria-hidden="true" />
              )}
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{node.title}</span>
              {node.count > 0 && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                  {node.count}
                </span>
              )}
            </div>
            {creationRoot?.sectionId && (
              <button
                type="button"
                aria-label={`สร้างหมวดย่อยใน ${creationRoot.title}`}
                disabled={creationBlocked}
                title={creationBlocked ? creationBlockMessage : undefined}
                onClick={() => onNavigate(`/admin/structure?section=${encodeURIComponent(creationRoot.sectionId!)}&mode=create-child`)}
                className="flex min-h-11 w-full cursor-pointer items-center border-l border-border px-3 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                style={{ paddingInlineStart: "60px" }}
              >
                ＋ เพิ่มหมวดย่อย
              </button>
            )}
          </Fragment>
        );
      })}
      </div>
      <div aria-label="การสร้างหมวด" className="sticky bottom-0 z-10 space-y-1 border-t bg-card pt-2">
        <button
          type="button"
          aria-label="สร้างหมวดหลัก"
          disabled={creationBlocked}
          title={creationBlocked ? creationBlockMessage : undefined}
          onClick={() => onNavigate("/admin/structure?mode=create-root")}
          className="flex min-h-11 w-full cursor-pointer items-center rounded-md px-3 text-left text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          style={{ paddingInlineStart: "28px" }}
        >
          ＋ สร้างหมวดหลัก
        </button>
        {creationBlocked && <p className="sr-only">{creationBlockMessage}; การสร้างหมวดถูกปิดชั่วคราว</p>}
      </div>
    </div>
  );
}
