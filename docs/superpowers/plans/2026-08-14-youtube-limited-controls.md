# YouTube Limited Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** จำกัดบล็อก YouTube ให้ควบคุมได้เฉพาะ Play/Pause และ Volume ใน Public reader และ Admin preview.

**Architecture:** เพิ่ม Client Component ขนาดเล็กเฉพาะ player เพื่อใช้ YouTube IFrame Player API; `DocumentContent` ยังคงเป็น Server Component และส่งผ่านเพียง URL ที่ validate แล้วให้ component นี้. Player จะซ่อน native controls, ปิด fullscreen/keyboard, มี overlay รับ pointer event ป้องกันการกดใน iframe และแสดง custom controls ที่ accessible.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Vitest, Testing Library, YouTube IFrame Player API.

## Global Constraints

- คง Tiptap JSON และ URL `https://www.youtube-nocookie.com/embed/<11-char-id>` เดิม
- ไม่เพิ่ม package และไม่เปลี่ยน Editor insert flow
- Client Component รับเฉพาะ prop `src: string` ที่ serializable
- Player options ต้องมี `controls=0`, `disablekb=1`, `fs=0`, `playsinline=1`, `rel=0`, `iv_load_policy=3`, `enablejsapi=1`
- ไม่มี `allowFullScreen`; iframe interaction ต้องถูก overlay ป้องกัน
- Custom controls มีเพียง Play/Pause, mute/unmute และ `input[type=range]` สำหรับ volume
- หาก API ล้มเหลว แสดงข้อความไทยและ fallback link ไป `https://www.youtube.com/watch?v=<videoId>`

---

## File structure

- Create `src/components/public/youtube-player.tsx` — client-only IFrame API wrapper, player state, custom controls และ fallback.
- Create `src/components/public/youtube-player.test.tsx` — mock IFrame API แล้วทดสอบ player vars, accessible controls, commands และ failure fallback.
- Modify `src/components/public/document-content.tsx` — render `YouTubePlayer` แทน iframe ตรง ๆ โดยคง allowlist เดิม.
- Modify `src/components/public/document-content.test.tsx` — ยืนยัน renderer ส่งเฉพาะ nocookie URL เข้า player และไม่ render URL ที่ไม่อนุญาต.
- Modify `src/app/globals.css` — layout overlay และ control bar ที่ responsive/focus-visible โดยไม่เพิ่ม native player controls.

### Task 1: สร้าง YouTube player แบบ test-first

**Files:**

- Create: `src/components/public/youtube-player.tsx`
- Create: `src/components/public/youtube-player.test.tsx`

**Interfaces:**

- Consumes: `src: string` ในรูป `https://www.youtube-nocookie.com/embed/<videoId>`
- Produces: `YouTubePlayer({ src }: { src: string }): JSX.Element`
- Uses: `window.YT.Player` with `playVideo()`, `pauseVideo()`, `mute()`, `unMute()`, `setVolume(number)`, `isMuted()` and events `onReady`, `onStateChange`, `onError`

- [ ] **Step 1: Write the failing test**

Create a jsdom test that installs a typed `window.YT.Player` spy. Render `<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />`, fire its captured `onReady`, and assert the constructor receives `videoId: "dQw4w9WgXcQ"` plus the seven required player vars. Assert buttons named `เล่นวิดีโอ`, `ปิดเสียง`, and range label `ระดับเสียง` exist while the element has no `allowfullscreen` attribute. Click play/mute and change volume to 35, then assert calls are `playVideo`, `mute`, and `setVolume(35)`. Add a separate test that fires `onError` and asserts Thai fallback copy and `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/components/public/youtube-player.test.tsx`

Expected: FAIL because module `./youtube-player` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create a `'use client'` component. In an effect, append the IFrame API script once, wait for `window.YT?.Player`, and construct it in a ref container with the required `playerVars` and event handlers. Keep `ready`, `playing`, `muted`, `volume`, and `failed` state. Render a `doc-video` container, player host, absolute `aria-hidden` pointer-blocking overlay, and a sibling `doc-video-controls` bar. Disable controls until ready; Play/Pause calls the matching API method, mute button toggles `mute`/`unMute`, and range clamps 0–100 before `setVolume`. On error, remove unavailable controls and render Thai fallback link using the validated 11-character ID. Remove the player on effect cleanup.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config vitest.config.mts run src/components/public/youtube-player.test.tsx`

Expected: PASS with player options, command calls, accessibility labels, and error fallback asserted.

- [ ] **Step 5: Commit**

Run: `git add src/components/public/youtube-player.tsx src/components/public/youtube-player.test.tsx`

Run: `git commit -m "feat: add limited YouTube controls"`

### Task 2: เชื่อม renderer และ styles แบบ test-first

**Files:**

- Modify: `src/components/public/document-content.tsx:1-108`
- Modify: `src/components/public/document-content.test.tsx:60-83`
- Modify: `src/app/globals.css:47-48`

**Interfaces:**

- Consumes: `YouTubePlayer` from `./youtube-player` and validated `src` from a `youtube` content node
- Produces: Public reader and `EditorPreview` render the same limited player through `DocumentContent`

- [ ] **Step 1: Write the failing test**

In the existing structural-node test, replace the iframe assertion with `screen.getByRole("button", { name: "เล่นวิดีโอ" })` and assert `screen.queryByTitle("วิดีโอ YouTube")` is null. Keep the malformed `youtube.com/embed/not-allowed` node and assert no player button is rendered. This test proves that the shared content renderer uses the custom player only for the existing nocookie allowlist.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:public`

Expected: FAIL because `DocumentContent` still renders a titled native iframe without custom controls.

- [ ] **Step 3: Write minimal implementation**

Import and render `<YouTubePlayer src={src} />` in the `youtube` branch only after the existing `youtube-nocookie.com/embed/` check succeeds. Replace the current `.doc-video iframe` CSS with rules for `.doc-video-player`, `.doc-video-overlay`, and `.doc-video-controls`: iframe remains full-size, overlay covers the video viewport but not the control bar, and controls stay visible with keyboard focus and at 320px width. Do not change `EditorPreview`; it already reuses `DocumentContent`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:public`

Expected: PASS, including valid player custom controls and rejection of malformed embeds.

- [ ] **Step 5: Commit**

Run: `git add src/components/public/document-content.tsx src/components/public/document-content.test.tsx src/app/globals.css`

Run: `git commit -m "feat: use limited controls for document videos"`

### Task 3: ตรวจ regression และ build

**Files:**

- Verify only: files from Tasks 1–2

**Interfaces:**

- Consumes: completed custom player and shared renderer
- Produces: verified local change with no changes to persisted content or editor insertion.

- [ ] **Step 1: Run focused content and public tests**

Run: `npm run test:content` and `npm run test:public`

Expected: both pass; URL validation and existing document rendering remain intact.

- [ ] **Step 2: Run static checks**

Run: `npx tsc --noEmit` and `npm run lint`

Expected: exit 0 with no new TypeScript or ESLint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: successful Next.js production build. Record only warnings actually emitted, without treating them as passed checks.

- [ ] **Step 4: Inspect final diff**

Run: `git diff --check` and `git diff -- src/components/public/youtube-player.tsx src/components/public/document-content.tsx src/app/globals.css`

Expected: no whitespace errors and only scoped files changed.

- [ ] **Step 5: Commit documentation status only if project status files require an update**

Do not edit module status files unless this cross-module follow-up changes an approved project status. If an update is required, stage only that documentation file and commit it separately.

## Self-review

- Spec coverage: Tasks 1–2 cover restricted controls, overlay click blocking, public/admin preview reuse, accessible controls, no fullscreen/keyboard, and fallback. Task 3 covers regression and production verification.
- Placeholder scan: no unresolved placeholders or unspecified test/implementation steps remain.
- Type consistency: `YouTubePlayer` consumes a single serializable `src` prop; `DocumentContent` is its sole server-side caller, which preserves the existing content boundary.
