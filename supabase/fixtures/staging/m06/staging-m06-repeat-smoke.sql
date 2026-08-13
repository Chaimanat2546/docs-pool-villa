-- Staging-only historical setup. Cleanup is now approved, but may run only
-- through the exact-target manifest after R2 and database preflight checks.
begin;

insert into public.doc_sections (id, title, slug, description, is_published, sort_order)
values (
  'f6400000-0000-4000-8000-000000000001',
  'M06 Staging Repeat Keep',
  'm06-staging-repeat-keep',
  'ข้อมูลทดสอบ M06 รอบที่สอง — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  false,
  998
)
on conflict (id) do nothing;

insert into public.doc_documents (id, section_id, title, slug, excerpt, content, status, sort_order)
values (
  'f6500000-0000-4000-8000-000000000001',
  'f6400000-0000-4000-8000-000000000001',
  'M06 Staging Repeat — pending lifecycle',
  'repeat-pending-lifecycle',
  'ข้อมูลทดสอบ M06 รอบที่สอง — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"f6600000-0000-4000-8000-000000000001","alt":"M06 repeat image"}}]}'::jsonb,
  'draft',
  998
)
on conflict (id) do nothing;

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
values (
  'f6600000-0000-4000-8000-000000000001',
  'f6500000-0000-4000-8000-000000000001',
  'docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp',
  'https://docs-media-staging.chaymanus2003.workers.dev/objects/docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp',
  'image/webp',
  26,
  1,
  1
)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = 'f6000000-0000-4000-8000-000000000001';

select *
from public.doc_prepare_document_save(
  'f6500000-0000-4000-8000-000000000001',
  'f6400000-0000-4000-8000-000000000001',
  'M06 Staging Repeat — finalized lifecycle',
  'repeat-pending-lifecycle',
  'ข้อมูลทดสอบ M06 รอบที่สอง — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[]}'::jsonb,
  'draft',
  998,
  1,
  '[]'::jsonb
);

commit;
