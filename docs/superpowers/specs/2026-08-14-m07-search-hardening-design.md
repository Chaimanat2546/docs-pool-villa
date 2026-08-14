# M07 Search, Performance & Production Hardening — Design Specification

**วันที่:** 14 สิงหาคม 2026

**สถานะ:** Design ได้รับอนุมัติจากภูแล้ว

**Requirement baseline:** [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)

**Module scope:** [M07 — Search, Performance & Production Hardening](../../todo/M07-search-hardening.md)

**Design baseline:** [Poolvilla Docs Design System](../../../DESIGN.md)

## 1. เป้าหมาย

M07 เพิ่ม Public search แบบ Command palette ที่ค้นได้ทั้งระดับเอกสารและหัวข้อ H2/H3 รองรับภาษาไทย คำบางส่วน และการพิมพ์คลาดเคลื่อน โดยออกแบบ Query path ให้รองรับเป้าหมาย 5,000 เอกสารและ 500 Public concurrent อย่างวัดผลซ้ำได้

Module นี้ปิดงานด้าน Performance, Accessibility, Browser compatibility, Security verification และ Production readiness ที่เหลือ โดยยังคงขอบเขต Docs-only, Published-only และไม่เปลี่ยน Legacy objects

## 2. สิ่งที่ไม่ทำ

- ไม่ใช้ Hosted search service, Search crawler, Vector search หรือ AI search
- ไม่ค้น Draft หรือข้อมูล Admin-only จาก Public UI
- ไม่เพิ่ม Search analytics, Query history, Recent searches หรือ Personalization
- ไม่สร้าง Synonym dictionary, Thai tokenizer หรือระบบแก้คำสะกดเฉพาะภาษา
- ไม่คัดลอก Branding, Tabs หรือ Layout ของ Next.js แบบตรงตัว
- ไม่เปลี่ยน Legacy tables, constraints, indexes, triggers, functions หรือ RLS
- ไม่ Apply Staging/Production migration และไม่ Deploy โดยไม่มีคำสั่งอนุมัติแยกจากภู

## 3. แนวทางที่เลือก

ใช้ Materialized search segments ใน PostgreSQL:

1. เอกสาร Published แต่ละฉบับถูกแบ่งเป็นหนึ่ง Document segment และหลาย Heading segments
2. Segments ถูกสร้างตอน Save/Publish ภายใน Database transaction เดียวกับเอกสาร
3. Public search ใช้ `pg_trgm` และ GIN index ค้น Segment โดยตรง
4. Public RPC จัดอันดับ จำกัดผล และคืนข้อมูลสำหรับ Group เอกสารกับหัวข้อ
5. Next.js Route Handler เป็น Input/output boundary สำหรับ Command palette และหน้า `/search`

แนวทางนี้ย้ายต้นทุนจาก Public read path ที่เกิดบ่อยไปยัง Admin write path ที่เกิดน้อยกว่า ทำให้ Latency และ Database load ระหว่าง Live search คาดการณ์ได้ดีกว่าการ Parse JSON content ใหม่ทุก Query

แนวทางที่ไม่เลือก:

- **Two-stage dynamic extraction:** Schema น้อยกว่า แต่ต้องอ่านและแยกหัวข้อของ Candidate documents ซ้ำทุก Query ทำให้ CPU แกว่งตามความยาวเอกสาร
- **Application-only extraction:** ลด SQL complexity แต่เพิ่ม Database egress หรือจำนวน Round trips และทำให้ Search index synchronization ไม่เป็น Atomic invariant

## 4. Database architecture

### 4.1 Extension

เปิด `pg_trgm` แบบ `create extension if not exists` ใน Schema `extensions` ตาม Supabase convention ที่ตรวจใน Environment จริงก่อนสร้าง Migration

Rollback ห้าม Drop extension อัตโนมัติ เพราะอาจมี Object อื่นใช้ร่วมกัน

### 4.2 `doc_search_segments`

สร้างตาราง Docs-owned `public.doc_search_segments` โดยเก็บเฉพาะ Segment ของเอกสาร Published:

- `document_id uuid not null` อ้าง `doc_documents(id)` แบบ `on delete cascade`
- `segment_order integer not null` เริ่ม Document segment ที่ 0 และ Heading segments ตามลำดับเนื้อหา
- `kind text not null` จำกัดเป็น `document` หรือ `heading`
- `heading_level smallint null` จำกัดเป็น 2 หรือ 3 สำหรับ Heading และเป็น `null` สำหรับ Document
- `heading_text text null` เป็นชื่อหัวข้อที่ Trim แล้ว
- `anchor text null` เป็น Heading ID ที่หน้าอ่านใช้จริง
- `body_text text not null` เป็นข้อความสำหรับ Snippet และ Ranking
- `search_text text not null` เป็นข้อความรวมที่ใช้กับ Trigram index
- Primary key `(document_id, segment_order)`

Primary key มี `document_id` เป็นคอลัมน์แรก จึงรองรับ FK lookup และ Cascade โดยไม่สร้าง B-tree index ซ้ำ

สร้าง GIN index ด้วย `gin_trgm_ops` บน `search_text` ตารางไม่มี Draft rows จึงไม่ต้องใช้ Partial predicate ซ้ำ

ชื่อเอกสาร, Excerpt, Section และ Route path ยังคงอ่านจาก Source tables ตอน Search ไม่ทำสำเนาลง Segment เพื่อป้องกัน Metadata ค้างไม่ตรงกัน

เปิด RLS และกำหนด Policy ชัดเจน:

- `anon` และ `authenticated` Select ได้เมื่อ Parent document ยังเป็น Published เท่านั้น
- Segment Insert/Update/Delete อนุญาตเฉพาะ `authenticated` Admin ตาม `(select doc_private.doc_is_admin())`
- `anon` ไม่มี Mutation privilege
- Trigger และ Helper ใช้ Invoker privilege; ห้ามเพิ่ม `SECURITY DEFINER` เพื่อแก้ Permission

### 4.3 Segment boundaries

Database helper เดิน Tiptap JSON แบบ Depth-first ตามลำดับเดียวกับ Public renderer และใช้กติกาต่อไปนี้:

- ข้าม `table` subtree เพื่อให้ตรงกับ Legacy rendering behavior
- ใช้เฉพาะ Text nodes; ไม่ Index URL, Media ID หรือ YouTube attributes
- Document segment ประกอบด้วย Title, Excerpt และข้อความก่อน H2/H3 แรก
- Heading segment ประกอบด้วยชื่อ H2/H3 และ Text nodes หลังหัวข้อนั้นจนถึง H2/H3 ถัดไป
- เอกสารที่ไม่มี H2/H3 ยังคงมี Document segment หนึ่งแถว
- Empty heading ถูกละทิ้งเหมือน Table of contents ปัจจุบัน

เนื้อหาแต่ละส่วนจึงถูกเก็บเพียง Segment เดียว ยกเว้นชื่อเอกสาร/Excerpt ที่ใช้เฉพาะ Document segment

### 4.4 Anchor contract

`anchor` ใน Segment ต้องตรงกับ `id` ที่ `DocumentContent` render แบบ Byte-for-byte:

1. Lowercase, Trim และ Normalize แบบ NFKD
2. ตัด Combining marks ช่วง U+0300–U+036F
3. แทนกลุ่มอักขระที่ไม่ใช่ Unicode Letter/Mark/Number ด้วย `-`
4. ตัด `-` ที่หัวท้าย และใช้ `section` เมื่อผลว่าง
5. เมื่อ Base ซ้ำตามลำดับหัวข้อในเอกสาร ให้ต่อ `-2`, `-3` และลำดับถัดไป

Database helper และ Shared TypeScript helper ต้องใช้ Contract นี้ร่วมกัน Cross-language fixture tests ต้องครอบคลุมภาษาไทย, Latin accents, punctuation, empty slug และชื่อที่ชนกันหลัง Normalize ก่อนยอมรับ Migration

### 4.5 Synchronization invariant

Trigger บน `doc_documents` ทำงานเมื่อ Insert/Update/Delete กระทบ Title, Excerpt, Content หรือ Status:

- Published document: ลบ Segments เดิมแล้วสร้างชุดใหม่
- Draft document: ลบ Segments ทั้งหมด
- Document delete: Foreign key cascade ลบ Segments

Delete/insert ชุดใหม่เกิดใน Transaction เดียวกับ Document mutation ผู้อ่านจึงเห็นชุดเก่าหรือชุดใหม่ที่สมบูรณ์เท่านั้น หาก Extraction หรือ Insert ล้มเหลว Document save ต้อง Rollback เพื่อไม่ให้ Search index ค้างไม่ตรงกับ Source document

Backfill เรียก Helper เดียวกับ Trigger สำหรับ Published documents ที่มีอยู่ และต้องเป็น Idempotent

## 5. Search RPC และ Ranking

สร้าง Public RPC แบบ `SECURITY INVOKER` พร้อม Fixed `search_path`:

- รับ Query ที่ Trim แล้ว ความยาว 2–200 ตัวอักษร
- ปฏิเสธ Query ที่ว่าง สั้นหรือยาวเกินกำหนด
- Escape `%`, `_` และ Escape character ให้เป็นตัวอักษรธรรมดาเมื่อใช้ Pattern matching
- ใช้ Trigram operators ที่ GIN รองรับสำหรับ Candidate filtering
- ใช้ Exact/prefix match และ Trigram similarity สำหรับ Ranking
- จำกัดไม่เกิน 10 Documents และ 20 Clickable results ต่อ Response
- จำกัด Snippet ให้สั้นและคืนเฉพาะ Field ที่ UI ต้องใช้

ลำดับน้ำหนักหลัก:

1. Exact/prefix document title
2. Document title similarity
3. Exact/prefix heading title
4. Heading title similarity
5. Segment body similarity

เมื่อคะแนนเท่ากันให้เรียงด้วย Section order, Document order และ `segment_order` เพื่อให้ผลลัพธ์ Deterministic

RPC Join `doc_documents` และ `doc_sections` เพื่อยืนยัน Published state และสร้าง Canonical path จาก Source metadata ทุกครั้ง RLS บนทั้ง Source และ Segment tables ยังคงเป็น Defense in depth

Function privileges ต้องใช้ Explicit `REVOKE/GRANT`; `anon` และ `authenticated` เรียกได้เฉพาะ Public search contract ที่จำเป็น ห้ามใช้ `service_role` ใน App client หรือ Route Handler

## 6. Application boundaries

### 6.1 Search domain module

สร้าง Server-only search module สำหรับ:

- Normalize และ Validate Query ที่ Trust boundary
- เรียก RPC ผ่าน Supabase publishable client
- แปลง Flat RPC rows เป็น Document groups
- จำกัดและ Escape Snippet/output ตาม Typed response contract
- แปลง Database failure เป็น Safe application error

Pure grouping, highlighting และ Anchor helpers แยกออกเพื่อ Unit test ได้โดยไม่ใช้ Network หรือ Database

### 6.2 Route Handler

`GET /api/search?q=...` เป็น Boundary สำหรับ Live search:

- `400` สำหรับ Query ไม่ถูกต้อง
- `200` พร้อม Bounded result สำหรับ Success/Empty
- `500` พร้อมข้อความทั่วไปสำหรับ Unexpected failure
- ไม่ส่ง SQL error, Schema detail, Stack trace หรือ Secret ไป Client
- ใช้ `Cache-Control: no-store` เพื่อไม่ให้ Search result เก่ากว่า Published source

### 6.3 Full search page

`/search?q=...` เป็น URL-addressable fallback สำหรับ Refresh, Bookmark, Share และกรณี JavaScript ใช้งานไม่ได้ หน้าใช้ Search domain contract เดียวกับ API และมี Form submit แบบมาตรฐาน

Header trigger คง `href="/search"` ไว้เป็น Progressive enhancement; Client intercept เฉพาะเมื่อ Command palette พร้อมทำงาน

## 7. Command palette design

ทิศทาง UI คือค้นหาเอกสารอย่างรวดเร็วด้วยลำดับ `เอกสาร → หัวข้อ` ที่อ่านง่าย ใช้ Interaction principle จาก Next.js reference แต่รักษา Poolvilla Docs tokens, Typography, Border, Radius, Focus ring และภาษาไทย

ใช้ Base UI Dialog ที่ Project มีอยู่แล้ว ไม่เพิ่ม Component package

### 7.1 Anatomy

- Header trigger แสดง Search icon และข้อความ **ค้นหาเอกสาร...** โดยไม่แสดง `Ctrl/⌘ K`
- Dialog มี Search input, ปุ่มปิดที่มองเห็น และ Scrollable result area
- ก่อนพิมพ์แสดง Published suggestions แบ่งตาม Section จาก Public navigation index ที่ Cache ไม่เกิน 5 วินาที
- หลังค้นหาแสดง Document เป็น Group header และ Heading matches แบบเยื้องด้านล่าง
- Document group row กดแล้วเปิด Canonical document path
- H2/H3 แสดงระดับและระยะเยื้องอย่างสม่ำเสมอโดยไม่พึ่งสีอย่างเดียว
- Highlight ส่วนที่ Match และแสดง Snippet หนึ่งบรรทัดโดยไม่ Inject raw HTML
- คลิกหรือแตะ Heading เปิด Canonical document path พร้อม `#anchor`

ไม่เพิ่ม Tabs แบบ App/Pages เพราะไม่ตรงกับ Information architecture ของ Poolvilla Docs

### 7.2 Interaction

- เริ่ม Live search เมื่อมีอย่างน้อย 2 ตัวอักษร
- Debounce 250 ms
- Abort request เก่าเมื่อ Query เปลี่ยน และยอมรับเฉพาะ Response ของ Query ล่าสุด
- Mouse/touch เป็นเส้นทางใช้งานหลัก
- Keyboard รองรับ Tab, Arrow Up/Down, Enter และ Escape โดยไม่แสดง Shortcut instruction ให้รก UI
- เปิด Dialog แล้ว Focus Search input; ปิดแล้วคืน Focus ให้ Header trigger
- Focus อยู่ใน Modal ขณะเปิด และ Result selection มี Visible focus/selected state

### 7.3 Responsive behavior

- Desktop ใช้ความกว้างจำกัดและวางกึ่งกลาง Viewport
- Mobile เว้นขอบหน้าจอที่กดได้สะดวก สูงไม่เกินประมาณ `80dvh`
- Input และปุ่มปิดอยู่คงที่ด้านบน; เฉพาะ Result area Scroll
- Interactive targets มีขนาดอย่างน้อย 44×44 CSS pixels ตาม Design baseline
- ไม่มี Horizontal page overflow และรองรับ Long Thai labels ด้วย Truncation ที่ไม่ซ่อน Accessible name

### 7.4 UI states

- **Default:** Published suggestions แบ่งตาม Section
- **Short query:** แนะนำให้พิมพ์อย่างน้อย 2 ตัวอักษร
- **Loading:** คงผลเดิมเพื่อลด Layout shift และแสดงสถานะกำลังค้นหา
- **Success:** แสดง Grouped results และประกาศจำนวนผลผ่าน Polite live region
- **Empty:** แจ้งคำที่ไม่พบและให้เปิดหน้า Search เต็ม
- **Error:** ข้อความทั่วไปพร้อม Retry โดยคง Query เดิม

สถานะ Loading, Empty, Error, Focus และ Selected ต้องไม่สื่อด้วยสีเพียงอย่างเดียว และ Motion ต้องเคารพ `prefers-reduced-motion`

## 8. Accessibility และ Browser support

Command palette ใช้ Dialog ครอบ Search input แบบ Combobox และ Result list แบบ Listbox/Options โดยเชื่อม `aria-controls`, `aria-expanded` และ `aria-activedescendant` ให้ตรงกับ Visual selection ส่วน Result count ประกาศผ่าน Polite live region

ต้องตรวจ:

- Mouse, Touch และ Keyboard-only flow
- Focus trap, Focus restore, Escape และ Visible focus
- Screen-reader labels และ Polite result announcement
- Zoom, Long Thai text, Reduced motion และ Color-independent states
- Responsive layout ที่ Mobile 390px และ Representative tablet/desktop widths
- Latest two versions ของ Chrome, Edge, Firefox, Safari macOS/iOS และ Chrome Android ตาม Requirement baseline

## 9. Security และ abuse boundaries

- Query เป็น Untrusted input และถูก Validate ทั้ง Route Handler กับ RPC
- SQL ใช้ Parameters เท่านั้น ห้ามประกอบ Dynamic SQL จาก Query
- Public search คืนเฉพาะ Published data ที่ RLS อนุญาต
- Direct Data API access ต่อ Segment table ต้องไม่เปิด Draft หรือข้าม Source publication state
- Response จำกัดจำนวน Rows และ Snippet length เพื่อลด Database egress และ Payload amplification
- Client debounce/abort เป็น Performance optimization ไม่ถือเป็น Security control
- Logs เก็บ Duration, Status และ Result count โดยไม่เก็บ Raw search query, Token หรือ Supabase key
- Dependency ใหม่ไม่จำเป็นสำหรับ Feature นี้; หาก Implementation พบว่าจำเป็นต้องเพิ่ม Package ต้องหยุดอธิบายเหตุผลและขออนุมัติ

## 10. Performance harness

สร้าง Repeatable harness สำหรับ Local/Staging ที่ได้รับอนุมัติ:

- Seed 5,000 Synthetic documents ด้วย Deterministic seed และ Test-only identifiers
- กระจาย Title, Excerpt, H2/H3, Content length, Thai text, Partial matches, Typos, Duplicate headings และ High-frequency terms
- เก็บรายการ Exact IDs/Prefix ที่ Harness สร้างและ Cleanup เฉพาะข้อมูลชุดนั้น
- ห้ามใช้ Production user data หรือ Copy Production data ไป Staging
- วัด Warm และ Cold-enough runs แยกกัน และรายงาน p50, p75, p95, Throughput และ Error rate
- ใช้ `EXPLAIN (ANALYZE, BUFFERS)` กับ Representative queries เพื่อยืนยัน Index path, Rows filtered และ Buffer behavior
- ทดสอบ Capacity target 500 Public concurrent และ 10 Admin โดยแยก Search load ออกจาก Admin save load

เกณฑ์ผ่าน:

- Search response ≤ 1 วินาทีที่ p95
- Server response ≤ 1 วินาทีที่ p95
- Public LCP ≤ 2.5 วินาทีที่ p75 บน Mobile profile
- Admin save ≤ 2 วินาทีที่ p95 รวม Segment rebuild
- Published change ค้นพบภายใน 5 วินาที
- ไม่มี Draft result, Data leak หรือ Error spike ภายใต้ Target load

หาก Query plan ไม่ใช้ GIN หรือ p95 ไม่ผ่าน ต้องปรับ Candidate predicate, Ranking หรือ Result bound จากหลักฐานก่อนพิจารณาเพิ่ม Compute

## 11. Test strategy

### 11.1 Database tests

- Extension/schema availability และ Migration idempotence
- Backfill สร้าง Segment เฉพาะ Published documents
- Publish, Published save, Unpublish และ Delete synchronization
- Extraction boundaries, Nested content, Legacy table omission และ Empty headings
- Anchor parity สำหรับ Thai, duplicate, normalization collision และ fallback
- Exact, Partial, Typo, Heading/body ranking และ Deterministic tie-break
- Query length/result/snippet bounds
- Guest, non-admin และ Admin RLS/privilege matrix
- Direct table access และ RPC ไม่คืน Draft
- Segment extraction failure Rollback Document mutation
- No Legacy object change

### 11.2 Application tests

- Query validation และ Safe error mapping
- RPC row grouping และ Ranking order preservation
- Highlighting ไม่ Inject HTML
- Debounce, stale request abort และ latest-response-only behavior
- Default, short, loading, success, empty, error และ retry states
- Header fallback link และ `/search?q=` behavior
- Click/touch navigation และ Heading anchor navigation
- Keyboard open, navigation, Enter, Escape, Focus trap/restore และ Live region

### 11.3 Performance และ browser verification

- Synthetic seed/cleanup safety test
- EXPLAIN plan snapshots หรือ Saved reports สำหรับ Representative queries
- Load test report ที่เก็บ p50/p75/p95, throughput และ errors
- Public page mobile LCP measurement
- Browser matrix smoke และ 390px no-overflow check
- Existing Public, Admin, Content, Database, lint และ build suites ยังคงผ่าน

## 12. Failure handling และ observability

- Search failure ไม่กระทบ Public navigation หรือ Reader; ผู้ใช้ Retry หรือใช้ `/search` ได้
- Segment rebuild failure ทำให้ Admin save ล้มเหลวแบบ Atomic และแสดง Safe retryable error
- Stale Client responses ห้าม Replace ผลของ Query ใหม่กว่า
- Empty result เป็น Success state ไม่ใช่ Error
- เก็บ Search latency, Status และ Result count เพื่อวิเคราะห์ p95 โดยไม่เก็บ Raw query
- ใช้ Database query statistics และ Saved `EXPLAIN` evidence ตรวจ Frequent/slow queries ก่อนปรับ Index หรือ Compute

## 13. Migration, rollout และ rollback

ลำดับ Migration:

1. ตรวจ Supabase/Postgres version และ Extension state
2. เปิด `pg_trgm` หากยังไม่มี
3. สร้าง Table, constraints, RLS และ privileges
4. สร้าง Private extraction/anchor/synchronization helpers
5. สร้าง GIN index และ Public `SECURITY INVOKER` search RPC
6. สร้าง Trigger
7. Backfill Published documents ด้วย Helper เดียวกับ Trigger
8. รัน Database tests, Advisors และ Representative EXPLAIN

Implementation รอบแรกจำกัด Local build/test เท่านั้น Staging migration/load test ต้องได้รับอนุมัติแยก และใช้ Test data เท่านั้น

ก่อน Production ต้องมี:

- Staging verification ที่ผ่าน Acceptance
- Backup ล่าสุดที่ตรวจสอบได้
- Migration dry run และระยะเวลาที่บันทึกไว้
- Rollback SQL/steps ที่ตรวจใน Staging
- Production migration/deployment approval แยกจากภู

Rollback ตามลำดับ:

1. ถอดหรือปิด Command palette/API consumer และคืน Header fallback
2. Drop Search trigger และ Public RPC
3. Drop Private search helpers, GIN index และ `doc_search_segments`
4. คง `pg_trgm` ไว้ เว้นแต่ตรวจ Dependency แล้วและได้รับอนุมัติชัดเจนให้ลบ

Rollback ไม่แก้ `doc_documents` content และไม่แตะ Legacy objects

## 14. Documentation updates ระหว่าง Implementation

- อัปเดต `docs/todo/M07-search-hardening.md` หลังจบแต่ละงานย่อย
- อัปเดต `TODO.md` เมื่อสถานะ Module เปลี่ยนจริง
- อัปเดต `docs/context/database.md` สำหรับ Segment/RPC/RLS contract
- อัปเดต `docs/context/testing-and-commands.md` ด้วยคำสั่งและผลที่รันจริง
- อัปเดต `context.md` เฉพาะเมื่อ Architecture, Schema boundary หรือ Module status เปลี่ยน
- ไม่เปลี่ยน M07 เป็น `in progress` จนกว่าภูจะสั่งเริ่ม Implementation

## 15. Acceptance และ Definition of Done

M07 ปิดได้เมื่อ:

1. Public search ค้น Title, Excerpt, H2/H3 และข้อความ Segment ได้ด้วยภาษาไทย, Partial และ Typo cases ที่กำหนด
2. Result เปิด Canonical document หรือ Heading anchor ที่ถูกต้อง รวมชื่อซ้ำ
3. Draft ไม่ปรากฏผ่าน UI, RPC หรือ Direct Data API access
4. Save/Publish/Unpublish/Delete ทำให้ Segment state ตรงกับ Source document แบบ Atomic
5. Command palette ใช้ได้ด้วย Mouse, Touch และ Keyboard พร้อม Focus/Screen-reader behavior ที่ถูกต้อง
6. Empty, Loading, Error, Retry และ JavaScript fallback ทำงานครบ
7. Search/Server/LCP/Save/visibility targets ผ่านบนชุด 5,000 Synthetic documents และ Capacity target ที่กำหนด
8. Synthetic cleanup ลบเฉพาะ Test data และไม่แตะ Legacy/Production data
9. Relevant automated suites, Database advisors, Build และ Browser matrix ผ่านจริง
10. Backup, Staging evidence และ Rollback plan พร้อมก่อนขอ Production approval
11. Code, Context, TODO และ Requirement ตรงกัน และไม่มี Deployment โดยไม่ได้รับอนุมัติ

## 16. เอกสารภายนอกที่ใช้ยืนยัน Design

- [PostgreSQL `pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance)
- [Supabase Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Next.js Accessibility documentation](https://nextjs.org/docs/architecture/accessibility)
