begin;
select no_plan();

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'm06-admin@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'm06-member@example.test');
insert into public.users (uid, role_id) values
  ('a0000000-0000-4000-8000-000000000001', 1),
  ('a0000000-0000-4000-8000-000000000002', 2);
insert into public.doc_sections (id, title, slug) values
  ('b1000000-0000-4000-8000-000000000001', 'M06 Documents', 'm06-documents');
insert into public.doc_documents (id, section_id, title, slug) values
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'เอกสาร M06', 'm06-document');

select has_table('public', 'doc_media_operations', 'M06 operation table exists');
select has_table('public', 'doc_media_operation_documents', 'M06 document freeze table exists');
select has_table('public', 'doc_media_operation_items', 'M06 exact manifest table exists');
select has_column('public', 'doc_media', 'mime_type', 'Media stores verified MIME type');
select has_column('public', 'doc_media', 'size_bytes', 'Media stores verified byte size');
select has_column('public', 'doc_media', 'width', 'Media stores verified width');
select has_column('public', 'doc_media', 'height', 'Media stores verified height');
select hasnt_column('public', 'doc_media', 'cleanup_required', 'Cleanup state has one source of truth');
select has_column('public', 'doc_media_cleanup', 'last_error', 'Cleanup stores the latest safe error');
select has_column('public', 'doc_media_cleanup', 'claim_token', 'Cleanup rows support leases');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_media_operations'::regclass), 'Operations have RLS enabled');

set local role anon;
select throws_ok($$select count(*) from public.doc_media_operations$$, '42501', null, 'Guest has no Operation table privilege');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select throws_ok(
  $$insert into public.doc_media_operations(kind, document_id, staged_save) values ('save_remove', 'b2000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'Non-admin cannot create operations'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select lives_ok(
  $$insert into public.doc_media_operations(kind, document_id, staged_save) values ('save_remove', 'b2000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  'Admin can create an operation'
);
select is((select count(*) from public.doc_media_operations), 1::bigint, 'Admin can read the operation');
reset role;

select * from finish();
rollback;
