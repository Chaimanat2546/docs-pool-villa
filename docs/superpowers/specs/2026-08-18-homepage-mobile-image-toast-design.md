# Homepage, Mobile Image Conversion & Admin Toast Design

**Date:** 18 August 2026  
**Status:** Approved design; awaiting review before implementation planning  
**Scope:** Public homepage, Admin editor image preparation on mobile, and the existing Admin toast provider

## Goals

1. Make the automatically generated public homepage a clear, Next.js-style starting point for the Baan Pool Villa documentation.
2. Let Admins prepare JPEG, PNG, WebP, HEIC, and HEIF images reliably on iPhone Safari before the established Save/upload lifecycle begins.
3. Prevent memory spikes when multiple images are selected or pasted on a mobile device.
4. Standardize transient Admin-management feedback with the existing toast implementation.

## Explicit non-goals

- No homepage editor, manually featured content, or change to the automatic Published-only data model.
- No database migration, RLS change, Media Worker change, Cloudflare deployment, or new upload contract.
- No raw source-image storage: the client still produces WebP before Save.
- No toast rollout to Public or Login pages.
- No replacement of inline validation, per-file errors, or durable media-operation Retry UI with transient notifications.

## Homepage

The homepage uses a category-first layout inspired by the clarity of Next.js documentation pages.

- The Hero shows the system name, **คู่มือสำหรับเว็บ Baan Pool Villa**, with a concise help-center treatment and a **เริ่มต้นใช้งาน** call to action.
- Search is deliberately absent from the Hero. The existing topbar Command Palette is the one search entry point.
- The call to action opens the first Published document by `sort_order`.
- Primary-section cards remain automatic. Each card contains three to five Published documents in that section, uses touch-friendly targets, and adapts responsively for mobile.
- The existing automatic **อัปเดตล่าสุด** section remains available below the category entry points.
- Draft and Archived documents must not appear in any homepage surface.

## Mobile image preparation

### Input and queue

- The editor accepts multiple selected files and repeated image pastes through one FIFO preparation queue.
- Each source file has the existing 10 MB maximum. This is a per-file limit, not a total selection limit.
- The queue processes exactly one image at a time. It exposes per-file states: pending, converting, ready, and failed, together with a summary such as “กำลังเตรียมรูป 2 จาก 5”.
- Each ready item opens the existing Alt-text dialog before it is inserted into the editor. The dialogs are shown one at a time in FIFO order, preserving the current accessibility flow rather than introducing an alternate metadata UI.
- Cancelling/removing an item or leaving the editor cancels work where possible and revokes preview object URLs. Once conversion succeeds, the source file/decoder output is released; only the resized WebP preview/blob is retained for the existing Save flow.
- A failed file does not halt following queued files. Its name and an actionable reason stay visible beside that file, with retry and remove controls.
- Save remains unavailable while at least one queued image is converting. Ready files keep the existing media lifecycle; failed files are never uploaded.

### Decoder and normalization

- JPEG, PNG, and WebP use a Safari-compatible `<img>` decoding path; `createImageBitmap()` is an optional successful-path optimization, never the sole dependency.
- HEIC and HEIF lazily load a browser-only decoder only when such a file is selected. The decoder output joins the same normalization path as native formats.
- The normalization step applies EXIF orientation, maintains aspect ratio, limits the longest side to 1920 px, and encodes the final Blob as WebP.
- Native `canvas.toBlob(..., "image/webp")` output is accepted only when its MIME type is exactly `image/webp`. A browser-only WebAssembly WebP encoder is lazy-loaded when native encoding is unavailable or returns another MIME type; HEIC/HEIF output uses that same guaranteed-WebP path.
- The existing browser preview, 10 MB source validation, HMAC ticket, and Worker-side WebP/container/dimension validation remain authoritative after preparation.
- If the browser cannot decode a source or cannot encode WebP, it reports a clear per-file error and performs no upload.

## Admin toast standardization

The existing `AdminToastProvider` becomes the single transient-feedback surface for Admin data-management outcomes.

### API and lifecycle

- Support `success`, `info`, `warning`, `error`, and `loading` kinds.
- A loading toast returns a stable ID. Callers update that toast to the final success, warning, or error outcome rather than showing several notifications for one action.
- Success and info dismiss after three seconds; warning dismisses after five seconds; error stays until manually dismissed; loading persists until callers update or dismiss it.
- Users may manually dismiss every non-loading toast. Mobile placement is the top center, constrained to the viewport width with a comfortably sized close target.
- Accessibility: success, info, and loading use a polite status announcement; warning and error use an assertive alert announcement.

### Migration rules

- Migrate transient completion/failure feedback for Admin operations such as document save, document reorder, and section create/edit to the centralized toast API.
- Use a single loading toast plus a final aggregate outcome when a multi-image preparation batch begins/finishes. Per-file progress and errors remain inline in the image queue.
- Keep field-level validation, retryable media-operation banners, and per-file failure text inline because they carry location-specific or persistent recovery information.

## Validation

- Unit tests cover native image decoder selection/fallback, HEIC/HEIF lazy decoding, EXIF orientation, resize, rejected non-WebP canvas output, WebAssembly WebP encoder fallback/errors, FIFO queue sequencing, item cancellation, retry, and object-URL cleanup.
- Component tests cover multiple-file selection, paste into the same queue, progress/error/retry rendering, and Save being blocked only while conversion is active.
- Browser validation includes real iPhone Safari for JPEG, PNG, HEIC, multiple-file queue handling, orientation, failed conversion, and Save/upload handoff.
- Toast tests cover each kind’s semantics and timing, loading-to-result updates, manual dismissal, roles, and mobile layout. Regression tests cover migrated Admin action feedback.
- Homepage tests verify the CTA target, Published-only category/document rendering, search absence from the Hero, and mobile-responsive navigation/card behavior.

## Completion boundaries

This work is complete only after the requested implementation, appropriate focused tests, local lint/build checks, documentation/TODO updates, and the above browser checks have passed. Staging and Production actions remain separately gated by the project rules.
