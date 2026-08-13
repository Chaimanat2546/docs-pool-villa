# M05 — Public Documentation

**Status:** Complete — Staging migration and smoke verification accepted by ภู on 13 August 2026

Requirement baseline: [Poolvilla Docs Requirements TH v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

## Remediation status — 13 August 2026

- [x] Implemented Public DTO/DAL, Published-only route, homepage, reader, shared renderer, navigation/TOC, SEO/sitemap, error/404 and redirect visibility RLS migration.
- [x] Fixed mobile drawer focus handling, mobile TOC, 44px touch targets, public cache invalidation, canonical environment contract and OpenNext-compatible request session handling.
- [x] Local automated checks passed: pgTAP 104, Public 7, Content 7, Worker 8, app/worker typecheck, lint, Next/OpenNext build, DB lint and dependency audit.
- [x] Local Browser shell smoke passed with clean test-data cleanup.
- [x] Staging Guest smoke with temporary data confirmed Homepage Published-only filtering, Reader, nested route, TOC, Previous/Next, Hidden 404/noindex and cleanup back to zero records.
- [x] Applied Staging migration `20260813033615_public_docs_redirect_visibility.sql` after dry-run. Guest old document path returned 308 directly to canonical path; archiving immediately made that redirect return 404, and the cached homepage refreshed Published data after its 5-second TTL. Test data was deleted and Staging DB lint passed.

## Goal

สร้างหน้า Public ที่อ่านได้เฉพาะเอกสาร Published และ Section ที่เปิดเผย โดยมี Homepage อัตโนมัติ, Reader, Navigation, TOC, Previous/Next, Redirect/404 และ SEO ครบตาม M05 พร้อมรับการต่อยอด Search จริงใน M07

## Confirmed implementation boundary

- M05 ใช้ข้อมูล `doc_sections`, `doc_documents`, `doc_media` และ `doc_route_redirects` ที่ M01–M04 สร้างไว้ ไม่เพิ่ม CMS หรือ Homepage Editor
- Search ใน M05 มีเฉพาะ Search entry และ route/query-string contract `/search?q=...`; การค้นหาจริง, `search_text`, `pg_trgm` และ GIN index อยู่ M07
- M05 เพิ่ม Docs-only migration ได้เฉพาะสิทธิ์อ่าน Redirect ที่จำเป็นต่อ Public rendering; ห้ามแก้ Legacy object หรือ Production
- Preview ปัจจุบันอยู่ภายใน Admin route จึงรับ `noindex` จาก Admin layout; ไม่มี Public preview URL ใหม่
- M05 ไม่เปลี่ยน Media delete/cleanup lifecycle ซึ่งเป็นขอบเขต M06
- ทำได้เฉพาะ Local implementation/build/test จนกว่าภูจะอนุมัติ Staging หรือ Deployment แยก

## Working decisions

- ใช้ Catch-all route `src/app/[...slug]/page.tsx` สำหรับเส้นทางเอกสาร 2–3 segments; Static routes เช่น `/admin`, `/auth` และ `/search` มีลำดับเหนือ Catch-all ตาม App Router
- หา Current Published document ก่อน ถ้าไม่พบจึงหา Public redirect; ถ้า Redirect ปลายทางไม่ Public หรือไม่พบให้ตอบ 404
- Public redirect อ่านได้เฉพาะแถวที่ผูก `document_id` และ Document ปลายทางยังผ่าน `doc_document_is_public()`; Draft/Archived/Hidden/Deleted ต้องไม่เผย Route history
- สร้าง Public data access layer แบบ `server-only` และคืน DTO เฉพาะ column ที่ UI ใช้; ใช้ Publishable key + RLS เท่านั้น ไม่ใช้ Service Role
- โปรเจกต์ยังไม่ได้เปิด `cacheComponents`; M05 จึงใช้ Next.js 16 previous caching model โดยห่อ Supabase query ที่เหมาะสมด้วย `unstable_cache`, กำหนด TTL ไม่เกิน 5 วินาที และ Tag กลางสำหรับ Public Docs
- Server Actions ของ Structure/Document ต้อง expire Public tag หลัง DB commit สำเร็จ โดย Published/Archive/Delete/Structure เปลี่ยนแล้ว Guest request ถัดไปต้องได้ข้อมูลใหม่ทันที; TTL 5 วินาทีเป็น fallback สำหรับการเปลี่ยนจากช่องทางอื่น
- Homepage, Sidebar, Start button และ Previous/Next ใช้ลำดับเดียวกัน: Parent Section `sort_order,id` → Child Section `sort_order,id` → Document `sort_order,id`
- Start button เปิด Published document รายการแรกใน flattened navigation order
- Section card แสดง Published document 4 รายการแรก และ Recent updates แสดง 5 รายการล่าสุดตาม `updated_at desc,id`
- TOC ใช้เฉพาะ H2/H3 จาก Tiptap JSON และสร้าง Heading ID แบบ deterministic พร้อมกันชื่อซ้ำ
- Public renderer เป็น React renderer จาก validated Tiptap JSON โดยไม่ใช้ `dangerouslySetInnerHTML`; Preview ใช้ renderer เดียวกันเพื่อให้ Supported nodes ตรงกับ Public
- Canonical ใช้ base URL ตาม Environment configuration; Production target คือ `https://docs.poolvilla.co.th` แต่ไม่ hard-code Staging ให้ชี้ Production

## Delivery plan

### 1. Public route and data contracts

- [ ] เพิ่ม Public DTO/types และ helper สร้าง canonical path จาก Section tree โดยเลือกเฉพาะ field ที่ต้องใช้
- [ ] เพิ่ม Public Supabase client/DAL แบบ `server-only` ซึ่งไม่มี Auth cookie และถูกจำกัดด้วย RLS
- [ ] Query Published navigation tree, Homepage cards, Recent updates, document detail, sibling order, Sitemap และ Redirect แบบแยกตาม access pattern
- [ ] Validate Catch-all params: รองรับเฉพาะ Document route 2 หรือ 3 segments และ slug รูปแบบที่ระบบอนุญาต
- [ ] แยก Not found ออกจาก Data-source failure; 404 ใช้กับ Missing/Hidden เท่านั้น ส่วน Supabase error ให้ Error boundary/log แบบไม่เผยรายละเอียดระบบ
- [ ] Deduplicate query ระหว่าง Page และ `generateMetadata()` ด้วย React request cache/Data Cache ที่เหมาะสม

### 2. Redirect visibility migration

- [ ] ใช้ Imperative migration ใหม่จาก Supabase CLI; ห้ามแก้ migration เดิม, Production baseline หรือ marker
- [ ] Grant `SELECT` บน `doc_route_redirects` ให้ `anon` เท่าที่จำเป็น
- [ ] เพิ่ม RLS SELECT policy สำหรับ Guest และ authenticated non-admin เฉพาะ Redirect ที่ `document_id` ไม่เป็น null และปลายทางยัง Public
- [ ] คง Admin policy เดิมและสิทธิ์ write เฉพาะ Admin; ไม่สร้าง `SECURITY DEFINER` Public RPC เพื่อ bypass RLS
- [ ] ยืนยันว่า index `old_path` unique ใช้กับ lookup และ partial index `document_id` รองรับ visibility helper แล้ว; ไม่เพิ่ม index ซ้ำโดยไม่มี Query plan/Advisor รองรับ
- [ ] เพิ่ม pgTAP matrix: Public redirect อ่านได้, Draft/Archived/Hidden redirect อ่านไม่ได้, Guest/non-admin เขียนไม่ได้ และ Admin ยังอ่าน/เขียนได้

### 3. Cache and freshness contract

- [ ] เพิ่ม cache tags สำหรับ Public navigation/document/SEO โดยใช้ Tag กลางที่ invalidate ได้ครบจาก mutation จุดเดียว
- [ ] ตั้ง time-based revalidation ไม่เกิน 5 วินาทีสำหรับ Public query ที่ cache ได้
- [ ] หลัง `saveSection`/`deleteSection` สำเร็จ ให้ expire Public tag หลัง DB commit เท่านั้น
- [ ] หลัง Document Save/Delete สำเร็จ ให้ invalidate เมื่อ visibility หรือข้อมูล Public อาจเปลี่ยน รวม Published edit, Archive, Republish, move, slug และ delete
- [ ] Draft-only Save ต้องไม่ทำให้ข้อมูล Draft หลุดเข้า cache แม้เลือก invalidate เพื่อความง่าย; RLS ยังคงเป็น Enforcement ชั้นสุดท้าย
- [ ] Save/DB failure ห้าม invalidate เป็น success และ Public ต้องคงข้อมูลเดิม
- [ ] ทดสอบ Guest เห็น Structure/Publish update ภายใน 5 วินาที และไม่เห็นข้อมูลระหว่าง transaction/failure

### 4. Shared public shell and Homepage

- [ ] สร้าง Public header/nav พร้อมชื่อ “คู่มือสำหรับเว็บ Baan Pool Villa”, Search entry, skip link และ Start button
- [ ] แทนหน้า Starter เดิมที่ `/` ด้วย Homepage อัตโนมัติจาก Published data
- [ ] Hero ใช้ข้อความใน Code, Search form ส่ง GET ไป `/search?q=...` และ Start button เปิดเอกสารแรกตาม navigation order
- [ ] แสดง Root Section cards เฉพาะหมวดที่มี Public document พร้อม Description และเอกสาร 4 รายการแรก
- [ ] แสดง Recent updates 5 รายการจาก Published documents โดยไม่เผย Draft/Archived/Hidden section
- [ ] รองรับ Empty state เมื่อยังไม่มี Published document โดย Search/Start ไม่เป็น dead control
- [ ] ใช้ Design tokens/แนวทางใน `DESIGN.md`: pill controls, card radius, green เฉพาะ accent, Homepage gradient แบบสงบ และไม่เพิ่ม font/package โดยไม่จำเป็น

### 5. Reader, content renderer and navigation

- [ ] สร้าง Reader route สำหรับเอกสารใน Root Section และ Child Section
- [ ] แสดง Breadcrumb, Title, Excerpt เมื่อมี, Updated date และเนื้อหาโดยคง Heading hierarchy ที่ถูกต้อง
- [ ] เพิ่ม Shared JSON renderer สำหรับ Paragraph, H2/H3, marks, lists, blockquote, code block, table, callout, image และ YouTube
- [ ] Link ภายนอกใช้ safe attributes; Image ใช้ Alt ที่ผ่าน validation; YouTube ใช้ `youtube-nocookie` พร้อม accessible title และ lazy loading
- [ ] Table/code/long URL ต้อง scroll หรือ wrap โดยไม่ทำให้ทั้งหน้าเกิด horizontal overflow
- [ ] สร้าง Sidebar tree จาก Published-only structure พร้อม `aria-current` ที่เอกสารปัจจุบัน
- [ ] Flatten navigation tree ชุดเดียวกันเพื่อสร้าง Previous/Next ที่ข้าม Section ได้ตาม `sort_order`
- [ ] สร้าง TOC จาก H2/H3 พร้อม anchor links และ indentation ของ H3; ถ้าไม่มี Heading ให้ซ่อน TOC ไม่ทิ้ง landmark ว่าง
- [ ] ปรับ Admin `EditorPreview` ให้ใช้ Shared renderer เดียวกับ Public และเพิ่ม parity tests สำหรับทุก Supported node

### 6. Responsive and accessible interactions

- [ ] Desktop ≥1024px ใช้ 3 columns: Sidebar ประมาณ 240px / prose สูงสุดประมาณ 720px / TOC ประมาณ 200px
- [ ] Tablet <1024px ยุบ Sidebar เป็น drawer และย้าย TOC เข้าเนื้อหาหรือ collapsible control ที่เข้าถึงด้วย Keyboard
- [ ] Mobile <768px เป็น single column, touch target อย่างน้อย 44px และไม่มี horizontal page overflow
- [ ] Drawer จัดการ initial focus, focus return, Escape, accessible name และ backdrop/close button
- [ ] ตรวจ semantic landmarks, skip link, visible focus, color contrast, heading order, link purpose, labels และ current navigation state
- [ ] รองรับ `prefers-reduced-motion` และไม่บังคับ animation ที่ไม่จำเป็น

### 7. SEO, Sitemap, 404 and Redirect rendering

- [ ] ตั้ง `metadataBase` จาก validated Environment URL และเพิ่ม canonical เฉพาะ Homepage/Public document
- [ ] `generateMetadata()` ของ Reader ใช้ Title/Excerpt/Canonical จาก Published document เดียวกับ Page
- [ ] เพิ่ม `src/app/sitemap.ts` ที่มี Homepage และ Published document canonical paths เท่านั้น พร้อม `lastModified`
- [ ] เพิ่ม Admin/Auth metadata เป็น `noindex,nofollow`; Preview dialog อยู่ใต้ Admin noindex
- [ ] Draft/Archived/Hidden/Missing/Deleted ใช้ `notFound()` และ Custom `not-found.tsx`; Next.js ต้องส่ง noindex อัตโนมัติ
- [ ] Route history ที่ยัง Public ใช้ `permanentRedirect()` และตอบ 308 ไป canonical ล่าสุดโดยไม่มี chain
- [ ] `/search` shell ใน M05 รับ/validate query contract แต่ยังไม่สร้างผลลัพธ์ Search; ตั้ง noindex ชั่วคราวจน M07 ส่ง Published-only result ที่สมบูรณ์

### 8. Test matrix

#### Database / pgTAP

- [ ] Guest และ non-admin อ่านได้เฉพาะ Redirect ของ Public document
- [ ] Redirect ของ Draft, Archived, Hidden Section/Parent และ Deleted document ไม่ถูกเปิดเผย
- [ ] Guest/non-admin แก้ Redirect ไม่ได้; Admin behavior เดิมไม่ถดถอย
- [ ] RLS Published-only tests ของ Section/Document/Media เดิมยังผ่านทั้งหมด

#### Unit / component

- [ ] Route builder/parser สำหรับ Root/Child section, malformed/reserved/too-deep path
- [ ] Navigation tree ordering, first document, section-card slicing, recent sorting และ Previous/Next boundaries
- [ ] TOC H2/H3, duplicate heading IDs, Thai heading และ empty TOC
- [ ] Renderer ครบทุก Supported node/mark, safe link, image Alt, YouTube URL และ malformed content failure
- [ ] Preview/Public parity ใช้ renderer/component contract เดียวกัน
- [ ] Homepage/Reader Empty/Error states และ Published-only DTO mapping
- [ ] Drawer keyboard/focus/ARIA และ responsive class contract ที่ตรวจด้วย DOM ได้
- [ ] Metadata, canonical, sitemap, noindex และ redirect decision functions

#### Local integration / browser

- [ ] Guest Homepage แสดงเฉพาะ Published cards/recent/start target; Draft/Archived/Hidden ไม่ปรากฏ
- [ ] Published Reader แสดงทุก node, Sidebar, TOC, Previous/Next และรูปจาก Worker URL
- [ ] Admin Publish/Edit/Archive/Republish/Structure change แล้ว Guest เห็นผลภายใน 5 วินาที
- [ ] เปลี่ยน slug/move แล้ว old path ตอบ 308 ไป canonical ล่าสุด; archived/deleted path ตอบ 404 ไม่ Redirect
- [ ] `/sitemap.xml` และ canonical ไม่มี Draft/Archived/Hidden/Redirect URL
- [ ] Desktop, tablet และ Mobile 390px ไม่มี overflow/console error; Keyboard-only ใช้ Header, Drawer, TOC และ Previous/Next ได้
- [ ] ตรวจ 404/noindex/Admin noindex ด้วย response HTML ไม่อาศัยเพียง visual check

### 9. Verification commands

- [ ] `npx supabase@latest --version` และเปิด `--help` ของ migration command ก่อนใช้
- [ ] `npx supabase@latest db reset`
- [ ] `npm run test:db`
- [ ] เพิ่มและรัน `npm run test:public`
- [ ] `npm run test:content`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run cf:build` เพื่อยืนยัน App Router/metadata/dynamic routes กับ Cloudflare adapter แบบ Local
- [ ] `npx supabase@latest db lint --local --schema public --level warning --fail-on error`
- [ ] Supabase security/performance advisors และยืนยันว่าไม่มี warning ใหม่ของ `doc_*`
- [ ] `npm audit --omit=dev`
- [ ] Browser smoke ตาม matrix ด้านบนโดยใช้ Test data เท่านั้นและลบกลับหลังจบ

## Acceptance

- [ ] Guest และ authenticated non-admin เห็นเฉพาะ Published document ที่ Section/Parent เปิดเผย
- [ ] Homepage, Start button, Cards, Recent, Sidebar, TOC และ Previous/Next ใช้ Published-only data และลำดับตรงกัน
- [ ] Structure/Published update ที่ Save สำเร็จสะท้อน Public ภายใน 5 วินาที; Save failure คง Public เดิม
- [ ] Preview และ Public render ตรงกันสำหรับ Supported nodes; Content invalid ไม่ถูก render แบบ unsafe
- [ ] Current route มี Canonical เดียว, old Public route ตอบ 308 ตรงไป canonical ล่าสุด และ Hidden/Deleted ตอบ 404
- [ ] Sitemap มี Homepage/Published canonical เท่านั้น; Admin/Auth/Preview/404/non-published เป็น noindex ตามกติกา
- [ ] Responsive 3-column/drawer/single-column ทำงานโดยไม่มี page overflow และ controls สำคัญใช้ Keyboard/Screen reader ได้
- [ ] Tests, typecheck, lint, Next/OpenNext build, DB lint/advisors และ Browser smoke ที่เกี่ยวข้องผ่านจริง
- [ ] Context/TODO อัปเดตตรงกับ implementation และไม่มี Secret/Test PII

## Explicit non-goals

- Search results, `search_text`, `pg_trgm`, GIN index, typo ranking และ Search performance — M07
- Remove-existing-image-before-save, cleanup retry และ Category cascade media deletion — M06
- Homepage Editor, Featured content, Analytics, multi-language, Public API, comments หรือ version history — ไม่อยู่ใน MVP
- Staging/Production migration, Cloudflare deployment หรือ Domain setup — ต้องได้รับคำสั่งแยกจากภู

## Stop

เมื่อ M05 ผ่าน Definition of Done ให้สรุปผล ไฟล์ Tests และข้อจำกัด แล้วหยุดรอภูยืนยัน M06
