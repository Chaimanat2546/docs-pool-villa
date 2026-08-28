begin;
select plan(25);

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);

insert into auth.users (id, email) values
  ('90000000-0000-0000-0000-000000000001', 'structure-admin@example.test');

insert into public.users (uid, role_id) values
  ('90000000-0000-0000-0000-000000000001', 1);

insert into public.doc_sections (id, title, slug, sort_order) values
  ('91000000-0000-0000-0000-000000000001', 'ราก A', 'root-a', 2),
  ('91000000-0000-0000-0000-000000000002', 'ราก B', 'root-b', 1),
  ('91000000-0000-0000-0000-000000000003', 'หมวดย่อย A', 'child-a', 0),
  ('91000000-0000-0000-0000-000000000004', 'หมวดลบได้', 'deletable', 0),
  ('91000000-0000-0000-0000-000000000005', 'หมวดมีรูป', 'with-media', 0);

update public.doc_sections
set parent_id = '91000000-0000-0000-0000-000000000001'
where id = '91000000-0000-0000-0000-000000000003';

insert into public.doc_sections (id, parent_id, title, slug, sort_order) values
  ('91000000-0000-0000-0000-000000000007', '91000000-0000-0000-0000-000000000001', 'หมวดย่อย B', 'child-b', 1);

insert into public.doc_documents (id, section_id, title, slug, sort_order) values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000004', 'ลบได้', 'deletable-doc', 4),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000005', 'มีรูป', 'media-doc', 3);

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000002', 'docs/92000000-0000-0000-0000-000000000002/media.webp', 'https://example.test/media.webp', 'image/webp', 1, 1, 1);

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'doc_sections'
     and column_name = 'description'),
  0::bigint,
  'Doc sections have no retired description column'
);

select is(
  (select sort_order from public.doc_documents where id = '92000000-0000-0000-0000-000000000001'),
  4,
  'Document sort order is stored for sidebar-ready ordering'
);

select throws_ok(
  $$insert into public.doc_sections (title, slug) values ('Reserved', 'admin')$$,
  '23514', null,
  'Reserved section slug is rejected by the database'
);

select throws_ok(
  $$insert into public.doc_sections (id, parent_id, title, slug) values ('91000000-0000-0000-0000-000000000006', '91000000-0000-0000-0000-000000000003', 'ลึกเกิน', 'too-deep')$$,
  '23514', null,
  'A third section level is rejected'
);

select throws_ok(
  $$update public.doc_sections set parent_id = id where id = '91000000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'A section cannot become its own parent'
);

select throws_ok(
  $$update public.doc_sections set parent_id = '91000000-0000-0000-0000-000000000002' where id = '91000000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'A root section with children cannot become a child section'
);

select is(
  (select parent_id from public.doc_sections where id = '91000000-0000-0000-0000-000000000001'),
  null::uuid,
  'Rejected reparenting keeps the original tree depth'
);

select throws_ok(
  $$insert into public.doc_sections (title, slug) values ('Root duplicate', 'root-a')$$,
  '23505', null,
  'Root slugs remain unique'
);

select lives_ok(
  $$insert into public.doc_sections (parent_id, title, slug) values ('91000000-0000-0000-0000-000000000002', 'ใช้ slug ซ้ำคนละ parent', 'child-a')$$,
  'Slug may be reused beneath a different parent'
);

insert into public.doc_route_redirects (old_path, target_path) values
  ('/redirect-reserved', '/root-a');

select throws_ok(
  $$insert into public.doc_sections (title, slug) values ('ชน redirect', 'redirect-reserved')$$,
  '23505', null,
  'A section route cannot collide with a redirect route'
);

set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.doc_reorder_sections(null, array[
    '91000000-0000-0000-0000-000000000002'::uuid,
    '91000000-0000-0000-0000-000000000001'::uuid,
    '91000000-0000-0000-0000-000000000004'::uuid,
    '91000000-0000-0000-0000-000000000005'::uuid
  ])$$,
  'Admin can reorder every root section atomically'
);
select is((select sort_order from public.doc_sections where id = '91000000-0000-0000-0000-000000000002'), 0, 'First reordered root receives sort order zero');
select lives_ok(
  $$select public.doc_reorder_sections('91000000-0000-0000-0000-000000000001', array[
    '91000000-0000-0000-0000-000000000007'::uuid,
    '91000000-0000-0000-0000-000000000003'::uuid
  ])$$,
  'Admin can reorder every child section under one root atomically'
);
select is((select sort_order from public.doc_sections where id = '91000000-0000-0000-0000-000000000007'), 0, 'First reordered child receives sort order zero');
select throws_ok(
  $$select public.doc_reorder_sections('91000000-0000-0000-0000-000000000001', array['91000000-0000-0000-0000-000000000007'::uuid, '91000000-0000-0000-0000-000000000007'::uuid])$$,
  '23514', 'The section order is invalid.',
  'Duplicate section ids are rejected'
);
select is((select sort_order from public.doc_sections where id = '91000000-0000-0000-0000-000000000007'), 0, 'Rejected reorder keeps persisted child order');

select is(
  (select child_section_count from public.doc_section_delete_preview('91000000-0000-0000-0000-000000000004')),
  0::bigint,
  'Deletion preview reports no child sections'
);

select is(
  (select document_count from public.doc_section_delete_preview('91000000-0000-0000-0000-000000000004')),
  1::bigint,
  'Deletion preview reports descendant documents'
);

select is(
  (select media_count from public.doc_section_delete_preview('91000000-0000-0000-0000-000000000005')),
  1::bigint,
  'Deletion preview reports media that must be cleaned first'
);

create temporary table prepared_media_section_delete as
select * from public.doc_prepare_section_delete('91000000-0000-0000-0000-000000000005', 'หมวดมีรูป');
select ok((select operation_id is not null from prepared_media_section_delete), 'Category with media creates a durable cleanup operation');

select throws_ok(
  $$select * from public.doc_prepare_section_delete('91000000-0000-0000-0000-000000000004', 'ชื่อไม่ตรง')$$,
  '23514', null,
  'Deletion rejects a confirmation name that does not match atomically'
);

select is(
  (select count(*) from public.doc_sections where id = '91000000-0000-0000-0000-000000000004'),
  1::bigint,
  'A rejected confirmation keeps the category'
);

select is(
  (select count(*) from public.doc_sections where id = '91000000-0000-0000-0000-000000000005'),
  1::bigint,
  'Failed media cleanup keeps the category'
);

create temporary table prepared_section_delete as
select * from public.doc_prepare_section_delete('91000000-0000-0000-0000-000000000004', 'หมวดลบได้');
select lives_ok(
  $$select * from public.doc_finalize_section_delete((select operation_id from prepared_section_delete))$$,
  'Category without media can be deleted'
);

select is(
  (select count(*) from public.doc_documents where id = '92000000-0000-0000-0000-000000000001'),
  0::bigint,
  'Deleting a category removes its documents'
);

reset role;

select * from finish();
rollback;
