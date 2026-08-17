# Admin document status toast design

## Goal

Replace inline background status messages in Admin document-management flows with a consistent toast notification.

## Scope

- Apply to document, section, and document-order actions in the Admin content area.
- Reuse existing action results and error handling; this change does not alter server actions, database behavior, or media lifecycle.
- Do not introduce a third-party notification package.

## Behavior

- Toasts render at the top center of the viewport and remain visible above the Admin content.
- Success notifications use `role="status"` and automatically dismiss after 3 seconds.
- Error notifications use `role="alert"`, do not auto-dismiss, and expose a labelled close button with an X icon.
- Starting a new notification replaces the previous one, preventing stacked and stale status messages.
- Error content remains available until explicitly dismissed, so failure details are not lost.

## Structure

- Add one client-side toast provider and hook for the Admin content layout.
- Replace local presentational status-message state in in-scope client components with the provider API.
- Keep local pending/submitting state where it controls disabled controls or progress UI.

## Accessibility and presentation

- The close button has an accessible Thai label and can receive keyboard focus.
- Toast colors and controls follow the existing Admin design tokens and retain sufficient contrast.
- The top-center container remains responsive and avoids overflowing narrow mobile viewports.

## Verification

- Component tests cover success auto-dismiss, persistent error toast, and manual error dismissal.
- Existing focused Admin document-management tests are updated to assert toast behavior instead of inline messages.
- Run the relevant Vitest suite, lint, and build after implementation.
