begin;
select plan(9);

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'search-member@example.test'),
  ('d0000000-0000-0000-0000-000000000002', 'search-admin@example.test');

insert into public.users (uid, role_id) values
  ('d0000000-0000-0000-0000-000000000001', 2),
  ('d0000000-0000-0000-0000-000000000002', 1);

insert into public.doc_sections (id, title, slug) values
  ('d1000000-0000-0000-0000-000000000001', 'คู่มือสาธารณะ', 'search-public');

insert into public.doc_documents (id, section_id, title, slug, excerpt, content, status) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'คู่มือล็อกอิน', 'login-guide', 'เข้าสู่ระบบ', '{"type":"doc","content":[]}'::jsonb, 'published'),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'การตั้งค่าบัญชี', 'settings', 'ล็อกอินอยู่ใน excerpt', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"ล็อกอินอยู่ใน content"}]}]}'::jsonb, 'published'),
  ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'ร่างล็อกอิน', 'draft-login', null, '{"type":"doc","content":[]}'::jsonb, 'draft'),
  ('d2000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', E'ค่าพิเศษ %_\\', 'literal-wildcards', null, '{"type":"doc","content":[]}'::jsonb, 'published');

set local role anon;
select is(
  (select array_agg(title order by title) from public.doc_documents where status = 'published' and title ilike '%ล็อก%'),
  array['คู่มือล็อกอิน']::text[],
  'Guest title search returns only the published partial-title match'
);
select is(
  (select count(*) from public.doc_documents where status = 'published' and title ilike E'%\\%\\_\\\\%' escape E'\\'),
  1::bigint,
  'Guest treats percent, underscore, and backslash as literal title characters'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
select is(
  (select array_agg(title order by title) from public.doc_documents where status = 'published' and title ilike '%ล็อก%'),
  array['คู่มือล็อกอิน']::text[],
  'Non-admin title search returns only the published partial-title match'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';
select is(
  (select array_agg(title order by title) from public.doc_documents where status = 'published' and title ilike '%ล็อก%'),
  array['คู่มือล็อกอิน']::text[],
  'Admin public-search predicate excludes drafts'
);
select is(
  (select count(*) from public.doc_documents where title ilike '%ล็อก%'),
  2::bigint,
  'Admin RLS still permits its existing draft visibility outside the public-search predicate'
);
reset role;

select ok(exists (select 1 from pg_extension where extname = 'pg_trgm'), 'pg_trgm is enabled');
select ok(to_regclass('public.doc_documents_published_title_trgm_idx') is not null, 'Published title search index exists');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'doc_documents'
      and indexname = 'doc_documents_published_title_trgm_idx'
      and indexdef like '%WHERE (status = ''published''::text)%'
  ),
  'Title index is partial for Published documents only'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'users' and indexname = 'doc_documents_published_title_trgm_idx'),
  0::bigint,
  'No legacy table receives the Docs title-search index'
);

select * from finish();
rollback;
