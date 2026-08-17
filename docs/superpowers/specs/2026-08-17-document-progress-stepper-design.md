# Document Progress Stepper Design

## Goal

Replace the document editor's three boxed progress items with a connected circular stepper that communicates completed, current, and upcoming stages without changing the document-save workflow.

## Scope

- Change only the progress indicator in `src/app/admin/(content)/documents/document-form.tsx`.
- Keep the existing three stages and their order: ข้อมูลเอกสาร, เขียนเนื้อหา, ตรวจและเผยแพร่.
- Preserve the existing `aria-current="step"` contract for the active stage.
- Add focused component-test coverage in `document-form.test.tsx` for the completed/current/upcoming state presentation.
- Do not add packages, routes, state, animations, or interactivity to the stepper.

## Visual Direction

The stepper is a quiet horizontal workflow rail matching the documented flat Docs interface. Each stage has a 40px circular marker on mobile and 48px at the `lg` breakpoint. Thai stage names remain visible beneath their markers, so the icon does not carry meaning alone.

- Completed stages use a soft mint surface, mint check icon, and a mint connecting rail.
- The current stage uses the primary dark surface with a white stage-specific icon. It keeps `aria-current="step"`.
- Upcoming stages use the muted surface with muted foreground icons and a neutral connecting rail.
- The final marker has no trailing connector.
- Connectors grow to fill the available horizontal space between markers.

## Responsive and Accessibility Rules

- Keep the three stages in one row at supported mobile widths; use `min-w-0`, centered labels, and compact 12px labels to prevent overflow.
- Markers are decorative context for their adjacent text: SVGs use `aria-hidden="true"`.
- The ordered-list semantics and Thai accessible list label remain unchanged.
- Do not make steps clickable, because navigation between stages is governed by save and validation behavior.

## Test Plan

- Render the content stage and verify: step 1 is completed, step 2 has `aria-current="step"`, and step 3 is upcoming.
- Render the review stage and verify: steps 1 and 2 are completed, while step 3 has `aria-current="step"`.
- Verify labels stay visible for all three stages and the connector is not rendered after the final stage.

## Out of Scope

- Editing the page header, form controls, save actions, route transitions, or document status labels.
- Replacing the project visual system or introducing a reusable global stepper component.
