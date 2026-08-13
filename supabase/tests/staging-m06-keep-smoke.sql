-- Staging-only M06 smoke setup. This intentionally commits the isolated
-- M06 Staging Keep records; do not run it locally or delete these records
-- until the user explicitly approves cleanup.
begin;

insert into auth.users (id, email)
values ('f6000000-0000-4000-8000-000000000001', 'm06-staging-keep@example.test')
on conflict (id) do update set email = excluded.email;

insert into public.users (uid, role_id)
select 'f6000000-0000-4000-8000-000000000001'::uuid, 1
where not exists (
  select 1 from public.users where uid = 'f6000000-0000-4000-8000-000000000001'
);

insert into public.doc_sections (id, title, slug, description, is_published, sort_order)
values ('f6100000-0000-4000-8000-000000000001', 'M06 Staging Keep', 'm06-staging-keep', 'ข้อมูลทดสอบ M06 — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ', false, 999)
on conflict (id) do nothing;

insert into public.doc_documents (id, section_id, title, slug, excerpt, content, status, sort_order)
values (
  'f6200000-0000-4000-8000-000000000001',
  'f6100000-0000-4000-8000-000000000001',
  'M06 Staging Keep — pending lifecycle',
  'pending-lifecycle',
  'ข้อมูลทดสอบ M06 — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"f6300000-0000-4000-8000-000000000001","alt":"M06 keep image"}}]}'::jsonb,
  'draft',
  999
)
on conflict (id) do nothing;

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
values (
  'f6300000-0000-4000-8000-000000000001',
  'f6200000-0000-4000-8000-000000000001',
  'docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp',
  'https://docs-media-staging.chaymanus2003.workers.dev/objects/docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp',
  'image/webp', 26, 1, 1
)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = 'f6000000-0000-4000-8000-000000000001';

select *
from public.doc_prepare_document_save(
  'f6200000-0000-4000-8000-000000000001',
  'f6100000-0000-4000-8000-000000000001',
  'M06 Staging Keep — finalized lifecycle',
  'pending-lifecycle',
  'ข้อมูลทดสอบ M06 — เก็บไว้จนกว่าจะได้รับอนุมัติให้ลบ',
  '{"type":"doc","content":[]}'::jsonb,
  'draft',
  999,
  1,
  '[]'::jsonb
);

commit;
