# Sidebar section creation copy design

## Goal

Make section creation available from the Admin Explorer sidebar for every root section, using clear Thai labels.

## Behavior

- Show **คู่มือทั้งหมด · {จำนวนเอกสาร} เอกสาร** as a static heading above the tree, not as a tree item or filter.
- Show **สร้างหมวดหลัก** once below the section tree.
- Show **สร้างหมวดย่อยใน {ชื่อหมวด}** immediately below each root section's visible branch, whether that root is expanded or collapsed.
- Do not show a creation action for a child section; the existing two-level structure remains unchanged.
- Each action retains its existing navigation URL and is disabled during a pending media operation.

## Verification

Folder-tree tests cover action visibility, keyboard order, disabled state, and navigation URLs. Existing Admin shell and content tests remain regression checks.
