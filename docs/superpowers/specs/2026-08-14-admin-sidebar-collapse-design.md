# Admin Sidebar Collapse Design

**Status:** Approved in conversation on 2026-08-14

## Goal

Allow an Admin to collapse the desktop Sidebar to icons only, with the preference retained in the current browser.

## Scope

- Desktop Sidebar has an accessible toggle button.
- Expanded mode keeps the existing brand and navigation labels.
- Collapsed mode hides brand and navigation text, keeps navigation icons, and supplies accessible names/tooltips for icon-only links.
- The main content expands into the space released by the Sidebar.
- The value is stored in browser `localStorage` under `admin-sidebar-collapsed` and read only after client mount.
- Mobile navigation remains the existing drawer and is not affected.

## Non-goals

- No database, Auth, RLS, route, deployment, or cross-device preference sync changes.
- No change to the current Admin navigation items or unsaved-navigation behavior.

## Verification

- Component tests cover initial expanded state, toggle behavior, accessible collapsed links, and `localStorage` persistence.
- Run Admin shell tests, lint, Next build, and `git diff --check`.
