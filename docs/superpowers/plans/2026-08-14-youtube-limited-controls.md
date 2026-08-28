# YouTube Click Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนบล็อก YouTube เป็น thumbnail ก่อนเล่น และให้คลิก Play/Pause ได้เฉพาะพื้นที่กลางของ YouTube player.

**Architecture:** `YouTubePlayer` คงเป็น Client Component แต่ใช้ state เดียวคือ `isPlaying`. ก่อนเล่นแสดง thumbnail และปุ่ม; หลังเล่นแสดง nocookie iframe ที่ไม่มี control bar พร้อม click guard รอบขอบ. `DocumentContent` และ `EditorPreview` ใช้ component เดิมอยู่แล้ว.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Vitest, Testing Library, YouTube iframe.

## Global Constraints

- คง URL `youtube-nocookie.com/embed/<11-char-id>` และ Tiptap JSON เดิม
- ไม่เพิ่ม package หรือแก้ Editor insert flow
- iframe options: `autoplay=1`, `controls=0`, `disablekb=1`, `fs=0`, `iv_load_policy=3`, `playsinline=1`, `rel=0`
- ไม่มี `allowFullScreen`, IFrame Player API, custom volume หรือ seek controls
- click guard ปิดพื้นที่บน/ล่าง/ซ้าย/ขวา เหลือพื้นที่กลางให้ YouTube รับคลิก Play/Pause

---

### Task 1: แทน custom player ด้วย thumbnail และ click guard

**Files:**

- Modify: `src/components/public/youtube-player.tsx`
- Modify: `src/components/public/youtube-player.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Consumes: `YouTubePlayer({ src }: { src: string })`
- Produces: thumbnail button ก่อนเล่น หรือ iframe + `data-youtube-click-guard` หลังเล่น

- [ ] **Step 1: Write the failing tests**

Replace IFrame API mocks with two tests. First, render source `https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ` and assert button name `เล่นวิดีโอ YouTube`, thumbnail `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`, and no iframe. Second, click the button and assert iframe `src` has every required parameter, has no `allowfullscreen`, and the guard has four pointer-blocking child spans while no mute button or range input exists.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest --config vitest.config.mts run src/components/public/youtube-player.test.tsx`

Expected: FAIL because the component still initializes IFrame Player API and renders custom controls.

- [ ] **Step 3: Write minimal implementation**

Remove API types, loader, effects and custom controls. Parse the validated video ID, hold `isPlaying`, and build the iframe URL with `URLSearchParams`. Before play, render a button containing thumbnail URL `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg`; on click set `isPlaying(true)`. After play, render the iframe with `allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"`, `sandbox="allow-presentation allow-same-origin allow-scripts"`, `referrerPolicy="strict-origin-when-cross-origin"`, and four guard spans around its center. Update CSS for thumbnail and guard; remove control bar rules.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest --config vitest.config.mts run src/components/public/youtube-player.test.tsx`

Expected: PASS for thumbnail, restricted iframe URL, guard, and absence of custom controls.

- [ ] **Step 5: Commit**

Run: `git add src/components/public/youtube-player.tsx src/components/public/youtube-player.test.tsx src/app/globals.css`

Run: `git commit -m "feat: use YouTube click guard player"`

### Task 2: ตรวจ renderer และ regression

**Files:**

- Verify: `src/components/public/document-content.tsx`, `src/components/public/document-content.test.tsx`, files from Task 1

- [ ] **Step 1: Update renderer expectation**

Change the existing public document test to expect `เล่นวิดีโอ YouTube` before playback and assert the malformed non-nocookie embed still does not render a player.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:public`

Expected: FAIL because the old assertion expects the retired custom-play label.

- [ ] **Step 3: Run verification after the assertion is green**

Run: `npm run test:content`, `npm run test:public`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

Expected: all exit 0; record only actual build warnings.

- [ ] **Step 4: Commit**

Run: `git add src/components/public/document-content.test.tsx`

Run: `git commit -m "test: cover YouTube click guard rendering"`

## Self-review

- Spec coverage: Task 1 covers thumbnail, constrained iframe, no fullscreen/control bar, and center-only interaction; Task 2 covers shared Public/Admin renderer regression.
- Placeholder scan: no unresolved placeholders remain.
- Type consistency: `YouTubePlayer` keeps its existing serializable `src` prop, so `DocumentContent` requires no interface change.
