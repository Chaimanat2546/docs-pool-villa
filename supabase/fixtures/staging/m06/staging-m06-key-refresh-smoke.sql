-- Staging-only historical setup. Cleanup is now approved, but may run only
-- through the exact-target manifest after R2 and database preflight checks.
begin;

insert into public.doc_sections (id, title, slug, is_published, sort_order)
values (
  'f7000000-0000-4000-8000-000000000001',
  'M06 Staging Key Refresh Keep',
  'm06-staging-key-refresh-keep',
  false,
  995
)
on conflict (id) do nothing;

insert into public.doc_documents (id, section_id, title, slug, excerpt, content, status, sort_order)
values (
  'f7100000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000001',
  'M06 Staging Key Refresh — pending lifecycle',
  'key-refresh-pending-lifecycle',
  'ข้อมูลทดสอบ M06 key-refresh — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"f7200000-0000-4000-8000-000000000001","alt":"M06 key-refresh image"}}]}'::jsonb,
  'draft',
  995
)
on conflict (id) do nothing;

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
values (
  'f7200000-0000-4000-8000-000000000001',
  'f7100000-0000-4000-8000-000000000001',
  'docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp',
  'https://docs-media-staging.chaymanus2003.workers.dev/objects/docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp',
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
  'f7100000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000001',
  'M06 Staging Key Refresh — finalized lifecycle',
  'key-refresh-pending-lifecycle',
  'ข้อมูลทดสอบ M06 key-refresh — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[]}'::jsonb,
  'draft',
  995,
  1,
  '[]'::jsonb
);

commit;
