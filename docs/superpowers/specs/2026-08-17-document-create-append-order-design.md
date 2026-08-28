# Document Create Append Order Design

**Status:** Approved in conversation on 2026-08-17

## Goal

เอกสารใหม่ต้องได้รับ `sort_order` ถัดจากเอกสารสุดท้ายของหมวดเดียวกันโดยอัตโนมัติ

## Design

- การสร้างเอกสารใหม่ (`expected_version is null`) ให้ฐานข้อมูลคำนวณ `coalesce(max(sort_order), -1) + 1` จากเอกสารใน `section_id` เดียวกัน
- คำนวณหลังได้ advisory lock เดิมของ document/section mutation แล้ว จึงไม่เกิดลำดับชนกันเมื่อ Admin สร้างพร้อมกัน
- การแก้เอกสารเดิมยังใช้ `p_sort_order` ตามเดิม และการ reorder ยังคงใช้ `doc_reorder_documents` แบบ atomic
- Server Action สร้าง Draft ยังคงส่ง `sort_order` ที่ผ่าน validation ได้ แต่ฐานข้อมูลเป็น source of truth สำหรับลำดับเริ่มต้น

## Scope and safety

- เพิ่มเฉพาะ Docs-owned imperative migration ที่ replace `doc_save_document` โดยคง signature, privilege, RLS และ authorization เดิม
- ไม่แก้ตาราง legacy, ไม่เปลี่ยน RLS, ไม่มี remote migration/deployment
- เพิ่ม pgTAP proof: หมวดว่างเริ่มที่ 0, หมวดที่มีเอกสารต่อท้าย, แยกตามหมวด, และ update ไม่เขียนทับลำดับอัตโนมัติ

## Acceptance

1. สร้าง Draft ใหม่ในหมวดที่มีลำดับ 0..n ได้ `n + 1`
2. สร้างในหมวดว่างได้ 0
3. Update และ reorder เดิมไม่เปลี่ยนพฤติกรรม
4. Local DB tests ผ่านก่อนพิจารณา Staging; ไม่มี Production action
