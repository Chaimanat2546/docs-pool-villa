begin;
select plan(34);

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'document-admin@example.test'),
  ('a0000000-0000-0000-0000-000000000002', 'document-member@example.test');

insert into public.users (uid, role_id) values
  ('a0000000-0000-0000-0000-000000000001', 1),
  ('a0000000-0000-0000-0000-000000000002', 2);

insert into public.doc_sections (id, title, slug) values
  ('a1000000-0000-0000-0000-000000000001', 'คู่มือ', 'guides'),
  ('a1000000-0000-0000-0000-000000000002', 'คู่มือย่อย', 'getting-started');

update public.doc_sections
set parent_id = 'a1000000-0000-0000-0000-000000000001'
where id = 'a1000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

select throws_ok(
  $$select * from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'No access', 'no-access', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 0, null, '[]'::jsonb
  )$$,
  '42501', null,
  'Non-admin cannot save a document through the RPC'
);
select throws_ok(
  $$insert into public.doc_media_cleanup (document_id, object_key, last_error) values ('a2000000-0000-0000-0000-000000000001', 'docs/a2000000-0000-0000-0000-000000000001/cleanup.webp', 'test')$$,
  '42501', null,
  'Non-admin cannot create a cleanup record'
);
reset role;

set local role anon;
select is(
  (select count(*) from public.doc_media_cleanup),
  0::bigint,
  'Guest cannot read media cleanup records'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';

select is(
  (select version from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'เริ่มต้นใช้งาน', 'intro', 'สรุป',
    '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb, 'draft', 1, null,
    '[{"id":"a3000000-0000-0000-0000-000000000001","object_key":"docs/a2000000-0000-0000-0000-000000000001/a3000000-0000-0000-0000-000000000001.webp","public_url":"https://media.example.test/a300.webp","mime_type":"image/webp","size_bytes":26,"width":1,"height":1}]'::jsonb
  )),
  1::bigint,
  'Admin creates a draft at version 1'
);

select is((select status from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 'draft', 'Draft save does not publish');
select is((select count(*) from public.doc_media where document_id = 'a2000000-0000-0000-0000-000000000001'), 1::bigint, 'Save persists verified media metadata atomically');
select is((select mime_type from public.doc_media where id = 'a3000000-0000-0000-0000-000000000001'), 'image/webp', 'Save persists verified MIME');
select is((select size_bytes from public.doc_media where id = 'a3000000-0000-0000-0000-000000000001'), 26::bigint, 'Save persists verified byte size');
select is((select width from public.doc_media where id = 'a3000000-0000-0000-0000-000000000001'), 1, 'Save persists verified width');
select is((select height from public.doc_media where id = 'a3000000-0000-0000-0000-000000000001'), 1, 'Save persists verified height');
select is((select created_by from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 'a0000000-0000-0000-0000-000000000001'::uuid, 'Document records its creator');

select is(
  (select version from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'เริ่มต้นใช้งาน', 'intro', 'สรุป',
    '{"type":"doc","content":[]}'::jsonb, 'published', 1, 1, '[]'::jsonb
  )),
  2::bigint,
  'Publishing a document increments its version'
);
select is((select status from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 'published', 'Published state is stored');
select ok((select published_at is not null from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 'First publish sets published_at');
create temporary table m04_first_published_at as
select published_at from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001';

select is(
  (select version from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'เริ่มต้นใช้งาน', 'intro', 'สรุป',
    '{"type":"doc","content":[]}'::jsonb, 'archived', 1, 2, '[]'::jsonb
  )),
  3::bigint,
  'Archiving a document increments its version'
);
select is((select status from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 'archived', 'Archived state is stored');

select is(
  (select version from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'เริ่มต้นใช้งาน', 'intro', 'สรุป',
    '{"type":"doc","content":[]}'::jsonb, 'published', 1, 3, '[]'::jsonb
  )),
  4::bigint,
  'Republishing a document increments its version'
);
select is(
  (select document.published_at from public.doc_documents as document where id = 'a2000000-0000-0000-0000-000000000001'),
  (select published_at from m04_first_published_at),
  'Republishing preserves the first published_at value'
);

select throws_ok(
  $$select * from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'เขียนทับ', 'intro', null,
    '{"type":"doc","content":[]}'::jsonb, 'published', 1, 3, '[]'::jsonb
  )$$,
  'P0001', null,
  'Stale version is rejected without last-write-wins'
);
select is((select version from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 4::bigint, 'Version conflict keeps the stored document');

select is(
  (select path from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'เริ่มต้นใช้งาน', 'welcome', 'สรุป',
    '{"type":"doc","content":[]}'::jsonb, 'published', 0, 4, '[]'::jsonb
  )),
  '/guides/getting-started/welcome',
  'Moving a document returns its canonical nested path'
);
select is((select target_path from public.doc_route_redirects where old_path = '/guides/intro'), '/guides/getting-started/welcome', 'Old route redirects to the current canonical path');
select is((select document_id from public.doc_route_redirects where old_path = '/guides/intro'), 'a2000000-0000-0000-0000-000000000001'::uuid, 'Route history is linked to its document');

select throws_ok(
  $$select * from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'ชน redirect', 'intro', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 0, null, '[]'::jsonb
  )$$,
  '23505', null,
  'A current document route cannot collide with route history'
);

select lives_ok(
  $$select * from public.doc_save_document(
    'a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'อีกเรื่อง', 'second', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 1, null, '[]'::jsonb
  )$$,
  'A different document can be created in the same section'
);
select lives_ok(
  $$select public.doc_reorder_documents('a1000000-0000-0000-0000-000000000002', array['a2000000-0000-0000-0000-000000000002'::uuid, 'a2000000-0000-0000-0000-000000000001'::uuid])$$,
  'Admin can reorder every document in a section atomically'
);
select is((select sort_order from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000002'), 0, 'First reordered document receives sort order zero');
select is((select sort_order from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 1, 'Second reordered document receives sort order one');

select is(
  (select object_keys from public.doc_prepare_document_delete('a2000000-0000-0000-0000-000000000001', 5)),
  array['docs/a2000000-0000-0000-0000-000000000001/a3000000-0000-0000-0000-000000000001.webp']::text[],
  'Delete preparation returns the immutable media manifest'
);
select throws_ok(
  $$select public.doc_finalize_document_delete('a2000000-0000-0000-0000-000000000001', 4)$$,
  'P0001', null,
  'Delete finalization rejects a stale version'
);
select lives_ok(
  $$select public.doc_finalize_document_delete('a2000000-0000-0000-0000-000000000001', 5)$$,
  'Delete finalization removes a prepared current document'
);
select is((select count(*) from public.doc_documents where id = 'a2000000-0000-0000-0000-000000000001'), 0::bigint, 'Hard delete removes the document after external media cleanup');
select is((select count(*) from public.doc_media where document_id = 'a2000000-0000-0000-0000-000000000001'), 0::bigint, 'Hard delete removes media metadata after external media cleanup');
select is((select count(*) from public.doc_route_redirects where document_id = 'a2000000-0000-0000-0000-000000000001'), 0::bigint, 'Hard delete removes document route history');

reset role;
select * from finish();
rollback;
