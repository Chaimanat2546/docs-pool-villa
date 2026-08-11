begin;
select plan(41);

-- The production baseline supplies Legacy tables. Rows below exist only in the
-- rolled-back local test and never modify Staging or Production.
insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'non-admin@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.test');

insert into public.users (uid, role_id) values
  ('00000000-0000-0000-0000-000000000001', 2),
  ('00000000-0000-0000-0000-000000000002', 2),
  ('00000000-0000-0000-0000-000000000002', 1);

insert into public.doc_sections (id, parent_id, title, slug) values
  ('10000000-0000-0000-0000-000000000001', null, 'หมวดที่มีเอกสาร', 'published-root'),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'หมวดย่อยที่มีเอกสาร', 'published-child'),
  ('10000000-0000-0000-0000-000000000003', null, 'หมวดร่าง', 'draft-root');

insert into public.doc_documents (id, section_id, title, slug, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'เผยแพร่ระดับบน', 'published-root', 'published'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'เผยแพร่ระดับล่าง', 'published-child', 'published'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'ฉบับร่าง', 'draft', 'draft');

insert into public.doc_media (id, document_id, object_key, public_url) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'docs/published-root.png', 'https://example.test/published-root.png'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'docs/published-child.png', 'https://example.test/published-child.png'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'docs/draft.png', 'https://example.test/draft.png');

insert into public.doc_route_redirects (id, old_path, target_path) values
  ('40000000-0000-0000-0000-000000000001', '/old', '/new');

set local role anon;
select lives_ok($$select * from public.doc_sections$$, 'Guest section SELECT does not recurse');
select is((select count(*) from public.doc_sections), 2::bigint, 'Guest sees published structure, including parent sections');
select is((select count(*) from public.doc_documents), 2::bigint, 'Guest reads only published documents');
select is((select count(*) from public.doc_media), 2::bigint, 'Guest reads media only for published documents');
select is((select count(*) from public.doc_route_redirects), 0::bigint, 'Guest cannot read redirects');
select throws_ok($$select public.doc_is_admin()$$, '42501', null, 'Guest cannot call the admin RPC');
select throws_ok($$insert into public.doc_sections (title, slug) values ('Guest', 'guest')$$, '42501', null, 'Guest cannot create sections');
select throws_ok($$insert into public.doc_documents (section_id, title, slug) values ('10000000-0000-0000-0000-000000000001', 'Guest', 'guest')$$, '42501', null, 'Guest cannot create documents');
select throws_ok($$insert into public.doc_media (document_id, object_key, public_url) values ('20000000-0000-0000-0000-000000000001', 'docs/guest.png', 'https://example.test/guest.png')$$, '42501', null, 'Guest cannot create media');
select throws_ok($$insert into public.doc_route_redirects (old_path, target_path) values ('/guest', '/new')$$, '42501', null, 'Guest cannot create redirects');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select ok(not public.doc_is_admin(), 'Non-admin is not recognized as an administrator');
select lives_ok($$select * from public.doc_sections$$, 'Non-admin section SELECT does not recurse');
select is((select count(*) from public.doc_sections), 2::bigint, 'Non-admin sees published structure only');
select is((select count(*) from public.doc_documents), 2::bigint, 'Non-admin reads only published documents');
select is((select count(*) from public.doc_media), 2::bigint, 'Non-admin reads media only for published documents');
select is((select count(*) from public.doc_route_redirects), 0::bigint, 'Non-admin cannot read redirects');
select throws_ok($$insert into public.doc_sections (title, slug) values ('Non-admin', 'non-admin')$$, '42501', null, 'Non-admin cannot create sections');
select throws_ok($$insert into public.doc_documents (section_id, title, slug) values ('10000000-0000-0000-0000-000000000001', 'Non-admin', 'non-admin')$$, '42501', null, 'Non-admin cannot create documents');
select throws_ok($$insert into public.doc_media (document_id, object_key, public_url) values ('20000000-0000-0000-0000-000000000001', 'docs/non-admin.png', 'https://example.test/non-admin.png')$$, '42501', null, 'Non-admin cannot create media');
select throws_ok($$insert into public.doc_route_redirects (old_path, target_path) values ('/non-admin', '/new')$$, '42501', null, 'Non-admin cannot create redirects');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select ok(public.doc_is_admin(), 'A UID with an additional role_id = 1 row is an administrator');
select is((select count(*) from public.doc_sections), 3::bigint, 'Admin reads all sections');
select is((select count(*) from public.doc_documents), 3::bigint, 'Admin reads every document status');
select is((select count(*) from public.doc_media), 3::bigint, 'Admin reads all media');
select is((select count(*) from public.doc_route_redirects), 1::bigint, 'Admin reads redirects');
select lives_ok($$insert into public.doc_sections (id, title, slug) values ('10000000-0000-0000-0000-000000000004', 'Admin', 'admin-section')$$, 'Admin can create sections');
select lives_ok($$update public.doc_sections set title = 'Admin updated' where id = '10000000-0000-0000-0000-000000000004'$$, 'Admin can update sections');
select lives_ok($$insert into public.doc_documents (id, section_id, title, slug) values ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Admin', 'admin-document')$$, 'Admin can create documents');
select lives_ok($$update public.doc_documents set title = 'Admin updated' where id = '20000000-0000-0000-0000-000000000004'$$, 'Admin can update documents');
select lives_ok($$insert into public.doc_media (id, document_id, object_key, public_url) values ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'docs/admin.png', 'https://example.test/admin.png')$$, 'Admin can create media');
select lives_ok($$update public.doc_media set cleanup_required = true where id = '30000000-0000-0000-0000-000000000004'$$, 'Admin can update media');
select lives_ok($$insert into public.doc_route_redirects (id, old_path, target_path) values ('40000000-0000-0000-0000-000000000002', '/admin-old', '/admin-new')$$, 'Admin can create redirects');
select lives_ok($$update public.doc_route_redirects set target_path = '/admin-newer' where id = '40000000-0000-0000-0000-000000000002'$$, 'Admin can update redirects');
select lives_ok($$delete from public.doc_media where id = '30000000-0000-0000-0000-000000000004'$$, 'Admin can delete media');
select lives_ok($$delete from public.doc_documents where id = '20000000-0000-0000-0000-000000000004'$$, 'Admin can delete documents');
select lives_ok($$delete from public.doc_sections where id = '10000000-0000-0000-0000-000000000004'$$, 'Admin can delete sections');
select lives_ok($$delete from public.doc_route_redirects where id = '40000000-0000-0000-0000-000000000002'$$, 'Admin can delete redirects');
reset role;

select ok((select relrowsecurity from pg_class where oid = 'public.doc_sections'::regclass), 'RLS is enabled on doc_sections');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_documents'::regclass), 'RLS is enabled on doc_documents');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_media'::regclass), 'RLS is enabled on doc_media');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_route_redirects'::regclass), 'RLS is enabled on doc_route_redirects');

select * from finish();
rollback;
