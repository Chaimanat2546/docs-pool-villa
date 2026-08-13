-- Staging-only historical setup. Cleanup is now approved, but may run only
-- through the exact-target manifest after R2 and database preflight checks.
begin;

insert into public.doc_sections (id, title, slug, description, is_published, sort_order)
values (
  'f6c00000-0000-4000-8000-000000000001',
  'M06 Staging Refresh Keep',
  'm06-staging-refresh-keep',
  'ข้อมูลทดสอบ M06 refresh — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  false,
  996
)
on conflict (id) do nothing;

insert into public.doc_documents (id, section_id, title, slug, excerpt, content, status, sort_order)
values (
  'f6d00000-0000-4000-8000-000000000001',
  'f6c00000-0000-4000-8000-000000000001',
  'M06 Staging Refresh — pending lifecycle',
  'refresh-pending-lifecycle',
  'ข้อมูลทดสอบ M06 refresh — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"f6e00000-0000-4000-8000-000000000001","alt":"M06 refresh image"}}]}'::jsonb,
  'draft',
  996
)
on conflict (id) do nothing;

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
values (
  'f6e00000-0000-4000-8000-000000000001',
  'f6d00000-0000-4000-8000-000000000001',
  'docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp',
  'https://docs-media-staging.chaymanus2003.workers.dev/objects/docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp',
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
  'f6d00000-0000-4000-8000-000000000001',
  'f6c00000-0000-4000-8000-000000000001',
  'M06 Staging Refresh — finalized lifecycle',
  'refresh-pending-lifecycle',
  'ข้อมูลทดสอบ M06 refresh — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[]}'::jsonb,
  'draft',
  996,
  1,
  '[]'::jsonb
);

commit;
