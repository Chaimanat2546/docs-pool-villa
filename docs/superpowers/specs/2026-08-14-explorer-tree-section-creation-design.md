# Explorer Tree Section Creation Design

**Status:** Proposed

**Scope:** Add contextual section-creation actions to the Admin File Explorer tree.

## Goal

Allow an Admin to start creating a root section or a child section directly from the section tree, while preserving the existing two-level hierarchy, Server Action validation, and focus behavior.

## Selected approach

The folder tree displays a contextual creation action for each root section and one root-creation action at the end of the tree:

```text
คู่มือทั้งหมด
  Topic A
    Sub-topic A1
    + สร้าง Sub-topic
  Topic B
    + สร้าง Sub-topic
+ สร้าง Topic
```

- **สร้าง Topic** opens the existing right-pane inline form in `create-root` mode.
- **สร้าง Sub-topic** opens the existing right-pane inline form in `create-child` mode for that specific root section, regardless of the current tree selection.
- A child section never renders a create-child action, preserving the maximum two-level hierarchy.
- Actions use URL state so refresh, Back, Forward, and the existing unsaved-navigation guard remain authoritative.

## Sort order default

When a creation action opens the inline form, its `sort_order` default is the next available sibling order:

- root section: one greater than the highest existing root-section `sort_order`;
- child section: one greater than the highest existing child `sort_order` under the selected parent;
- no existing sibling: `0`.

The default remains editable through the existing advanced settings. The server continues to validate that the submitted value is a non-negative integer; no schema, migration, RLS, Auth, or media-lifecycle change is required.

## Interaction and accessibility

- Tree selection, expansion, and creation controls remain separate interactive elements.
- Each action has an explicit accessible name containing its parent topic where needed.
- Triggering an action opens the established inline form and moves focus to the section-name field.
- Cancel returns focus to the initiating tree action; successful creation selects the new section as it does today.
- The desktop tree and mobile drawer expose the same actions. The mobile drawer closes only when its existing navigation behavior determines it should.
- Pending media cleanup keeps the existing mutation block and disables creation actions consistently.

## Tests and verification

Add component tests that prove:

1. the tree renders root and contextual child creation actions only at permitted depths;
2. actions navigate to the existing URL modes with the correct parent section;
3. root and child forms receive the next sibling sort order, including the no-sibling case;
4. cancel and keyboard-accessible behavior preserve the existing focus and navigation guarantees.

Run the focused Admin Explorer tests first, then the relevant content/Admin shell suites, TypeScript check, lint, and build. No deployment is included.

## Non-goals

- No drag-and-drop or reorder redesign.
- No third hierarchy level.
- No automatic renumbering of existing sections.
- No deployment, migration, or remote-environment changes.
