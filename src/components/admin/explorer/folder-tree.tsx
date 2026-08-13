"use client";

import { ChevronRight, Folder, Library } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

export type FolderTreeProps = {
  sections: AdminExplorerSection[];
  selectedSectionId: string | null;
  onNavigate: (href: string) => void;
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

const VIRTUAL_ROOT_KEY = "virtual-root";

function sectionKey(sectionId: string): string {
  return `section:${sectionId}`;
}

function sectionHref(sectionId: string | null): string {
  return sectionId ? `/admin/structure?section=${encodeURIComponent(sectionId)}` : "/admin/structure";
}

function initialExpandedKeys(sections: AdminExplorerSection[], selectedSectionId: string | null): Set<string> {
  const expanded = new Set([VIRTUAL_ROOT_KEY]);
  const selected = sections.find((section) => section.id === selectedSectionId);
  if (selected?.parentId) expanded.add(sectionKey(selected.parentId));
  return expanded;
}

export function FolderTree({ sections, selectedSectionId, onNavigate }: FolderTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState(() => initialExpandedKeys(sections, selectedSectionId));
  const [focusedKey, setFocusedKey] = useState(() => selectedSectionId ? sectionKey(selectedSectionId) : VIRTUAL_ROOT_KEY);
  const [previousSelectedSectionId, setPreviousSelectedSectionId] = useState(selectedSectionId);
  const [treeHasFocus, setTreeHasFocus] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

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
    const nodes: VisibleTreeNode[] = [{
      key: VIRTUAL_ROOT_KEY,
      sectionId: null,
      title: "คู่มือทั้งหมด",
      count: sections.reduce((total, section) => total + section.directDocumentCount, 0),
      level: 1,
      parentKey: null,
      childKeys: rootSections.map((section) => sectionKey(section.id)),
    }];

    if (!expandedKeys.has(VIRTUAL_ROOT_KEY)) return nodes;

    for (const rootSection of rootSections) {
      const rootKey = sectionKey(rootSection.id);
      const childSections = childSectionsByParent.get(rootSection.id) ?? [];
      nodes.push({
        key: rootKey,
        sectionId: rootSection.id,
        title: rootSection.title,
        count: rootSection.directDocumentCount,
        level: 2,
        parentKey: VIRTUAL_ROOT_KEY,
        childKeys: childSections.map((section) => sectionKey(section.id)),
      });

      if (!expandedKeys.has(rootKey)) continue;
      for (const childSection of childSections) {
        nodes.push({
          key: sectionKey(childSection.id),
          sectionId: childSection.id,
          title: childSection.title,
          count: childSection.directDocumentCount,
          level: 3,
          parentKey: rootKey,
          childKeys: [],
        });
      }
    }

    return nodes;
  }, [childSectionsByParent, expandedKeys, sections]);

  const focusedNodeIsVisible = visibleNodes.some((node) => node.key === focusedKey);
  const selectedKey = selectedSectionId ? sectionKey(selectedSectionId) : VIRTUAL_ROOT_KEY;
  const selectedNodeIsVisible = visibleNodes.some((node) => node.key === selectedKey);
  const reconciledFocusedKey = focusedNodeIsVisible ? focusedKey : selectedNodeIsVisible ? selectedKey : VIRTUAL_ROOT_KEY;
  const shouldRestoreTreeFocus = !focusedNodeIsVisible && treeHasFocus;

  useLayoutEffect(() => {
    if (shouldRestoreTreeFocus) itemRefs.current.get(reconciledFocusedKey)?.focus();
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, node: VisibleTreeNode, index: number) {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        onNavigate(sectionHref(node.sectionId));
        return;
      case "ArrowRight":
        if (node.childKeys.length === 0) return;
        event.preventDefault();
        if (!expandedKeys.has(node.key)) setExpanded(node.key, true);
        else focusNode(node.childKeys[0]);
        return;
      case "ArrowLeft":
        if (node.childKeys.length > 0 && expandedKeys.has(node.key)) {
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
    <div
      role="tree"
      aria-label="หมวดคู่มือ"
      className="space-y-1"
      onFocusCapture={() => setTreeHasFocus(true)}
      onBlurCapture={(event) => setTreeHasFocus(event.currentTarget.contains(event.relatedTarget as Node | null))}
    >
      {visibleNodes.map((node, index) => {
        const hasChildren = node.childKeys.length > 0;
        const isExpanded = hasChildren && expandedKeys.has(node.key);
        const isSelected = node.sectionId === selectedSectionId;
        const Icon = node.sectionId === null ? Library : Folder;

        return (
          <button
            key={node.key}
            ref={(element) => {
              if (element) itemRefs.current.set(node.key, element);
              else itemRefs.current.delete(node.key);
            }}
            type="button"
            role="treeitem"
            aria-level={node.level}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-label={`${node.title} ${node.count} เอกสาร`}
            tabIndex={reconciledFocusedKey === node.key ? 0 : -1}
            onFocus={() => setFocusedKey(node.key)}
            onClick={() => onNavigate(sectionHref(node.sectionId))}
            onKeyDown={(event) => handleKeyDown(event, node, index)}
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-muted aria-selected:font-medium"
            style={{ paddingInlineStart: `${12 + (node.level - 1) * 16}px` }}
          >
            {hasChildren ? (
              <ChevronRight className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} aria-hidden="true" />
            ) : (
              <span className="w-4 shrink-0" aria-hidden="true" />
            )}
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{node.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">{node.count}</span>
          </button>
        );
      })}
    </div>
  );
}
