begin;

do $$
begin
  if not exists (
    select 1 from public.users
    where uid = 'f6000000-0000-4000-8000-000000000001'::uuid
      and role_id = 1
  ) then
    raise exception 'Expected synthetic Staging admin mapping is missing';
  end if;
end
$$;

set local role authenticated;
set local request.jwt.claim.sub = 'f6000000-0000-4000-8000-000000000001';

insert into public.doc_sections
  (id, parent_id, title, slug, is_published, sort_order)
values
  ('fa100000-0000-4000-8000-000000000001', null,
   'M01-M06 Closeout', 'm01-m06-closeout', true, 900),
  ('fa100000-0000-4000-8000-000000000002',
   'fa100000-0000-4000-8000-000000000001',
   'M01-M06 Closeout Advanced', 'advanced', true, 901),
  ('fa100000-0000-4000-8000-000000000003', null,
   'M01-M06 Closeout Hidden', 'm01-m06-closeout-hidden', false, 902)
on conflict (id) do nothing;

insert into public.doc_documents
  (id, section_id, title, slug, excerpt, content, status, published_at, sort_order)
values
  ('fa200000-0000-4000-8000-000000000001',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Overview', 'overview', 'Published root fixture',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"ภาพรวม"}]},{"type":"paragraph","content":[{"type":"text","text":"เนื้อหาทดสอบรอบปิดงาน"}]}]}'::jsonb,
   'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000002',
   'fa100000-0000-4000-8000-000000000002',
   'Closeout Reader', 'reader', 'Published child fixture',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"หัวข้อหลัก"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"หัวข้อย่อย"}]},{"type":"paragraph","content":[{"type":"text","text":"Reader fixture"}]}]}'::jsonb,
   'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000003',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Draft', 'draft', 'Draft fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 2),
  ('fa200000-0000-4000-8000-000000000004',
   'fa100000-0000-4000-8000-000000000003',
   'Closeout Hidden Published', 'hidden-published', 'Hidden fixture',
   '{"type":"doc","content":[]}'::jsonb, 'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000005',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Conflict', 'conflict', 'Conflict fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 3),
  ('fa200000-0000-4000-8000-000000000006',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Redirect', 'redirect-source', 'Redirect fixture',
   '{"type":"doc","content":[]}'::jsonb, 'published', now(), 4),
  ('fa200000-0000-4000-8000-000000000007',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Media', 'media', 'Media lifecycle fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 5)
on conflict (id) do nothing;

commit;
