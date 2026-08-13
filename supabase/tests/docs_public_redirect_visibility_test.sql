begin;
select plan(11);

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'public-member@example.test'),
  ('b0000000-0000-0000-0000-000000000002', 'public-admin@example.test');

insert into public.users (uid, role_id) values
  ('b0000000-0000-0000-0000-000000000001', 2),
  ('b0000000-0000-0000-0000-000000000002', 1);

insert into public.doc_sections (id, title, slug, is_published) values
  ('b1000000-0000-0000-0000-000000000001', 'เผยแพร่', 'public', true),
  ('b1000000-0000-0000-0000-000000000002', 'ซ่อน', 'hidden', false),
  ('b1000000-0000-0000-0000-000000000003', 'พ่อแม่ซ่อน', 'hidden-parent', false);

insert into public.doc_sections (id, parent_id, title, slug, is_published) values
  ('b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'ลูกที่เปิด', 'visible-child', true);

insert into public.doc_documents (id, section_id, title, slug, status) values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'เผยแพร่', 'current', 'published'),
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'ฉบับร่าง', 'draft', 'draft'),
  ('b2000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'เก็บถาวร', 'archived', 'archived'),
  ('b2000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'อยู่ในหมวดซ่อน', 'hidden', 'published'),
  ('b2000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000004', 'อยู่ใต้พ่อแม่ซ่อน', 'hidden-parent', 'published');

insert into public.doc_route_redirects (old_path, target_path, document_id) values
  ('/old-public', '/public/current', 'b2000000-0000-0000-0000-000000000001'),
  ('/old-draft', '/public/draft', 'b2000000-0000-0000-0000-000000000002'),
  ('/old-archived', '/public/archived', 'b2000000-0000-0000-0000-000000000003'),
  ('/old-hidden', '/hidden/hidden', 'b2000000-0000-0000-0000-000000000004'),
  ('/old-hidden-parent', '/hidden-parent/visible-child/hidden-parent', 'b2000000-0000-0000-0000-000000000005'),
  ('/legacy-unlinked', '/public/current', null);

set local role anon;
select is((select count(*) from public.doc_route_redirects), 1::bigint, 'Guest reads only redirects for public documents');
select is((select target_path from public.doc_route_redirects where old_path = '/old-public'), '/public/current', 'Guest resolves a public document redirect');
select is((select count(*) from public.doc_route_redirects where old_path in ('/old-draft', '/old-archived', '/old-hidden', '/old-hidden-parent', '/legacy-unlinked')), 0::bigint, 'Guest cannot read non-public or unlinked redirects');
select throws_ok($$insert into public.doc_route_redirects (old_path, target_path) values ('/guest-write', '/public/current')$$, '42501', null, 'Guest cannot write redirects');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
select is((select count(*) from public.doc_route_redirects), 1::bigint, 'Non-admin reads only redirects for public documents');
update public.doc_route_redirects set target_path = '/public/member-attempt' where old_path = '/old-public';
select is((select target_path from public.doc_route_redirects where old_path = '/old-public'), '/public/current', 'Non-admin update is filtered by RLS and does not change a public redirect');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000002';
select is((select count(*) from public.doc_route_redirects), 6::bigint, 'Administrator retains complete redirect visibility');
select lives_ok($$update public.doc_route_redirects set target_path = '/public/current' where old_path = '/old-public'$$, 'Administrator retains redirect write access');
reset role;

update public.doc_documents set status = 'archived' where id = 'b2000000-0000-0000-0000-000000000001';

set local role anon;
select is((select count(*) from public.doc_route_redirects where old_path = '/old-public'), 0::bigint, 'Archiving immediately hides the old public redirect');
reset role;

select ok(has_table_privilege('anon', 'public.doc_route_redirects', 'select'), 'Anon has only the required table select privilege for RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_route_redirects'::regclass), 'Redirect table keeps RLS enabled');
select * from finish();
rollback;
