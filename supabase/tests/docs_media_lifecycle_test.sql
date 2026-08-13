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
select has_function('public', 'doc_record_media_cleanup', array['uuid', 'jsonb', 'text'], 'Cleanup record RPC exists');
select has_function('public', 'doc_claim_media_cleanup', array['uuid', 'integer'], 'Cleanup claim RPC exists');
select has_function('public', 'doc_complete_media_cleanup', array['uuid', 'text[]'], 'Cleanup complete RPC exists');
select has_function('public', 'doc_fail_media_cleanup', array['uuid', 'text[]', 'text'], 'Cleanup failure RPC exists');
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
select throws_ok(
  $$select public.doc_record_media_cleanup('b2000000-0000-4000-8000-000000000001', '[]'::jsonb, 'nope')$$,
  '42501', null, 'Non-admin cannot enqueue cleanup work'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.doc_record_media_cleanup(
    'b2000000-0000-4000-8000-000000000001',
    '[{"object_key":"docs/b2000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-000000000001.webp","display_label":"รูปตกค้าง.webp"}]'::jsonb,
    'R2 unavailable'
  )$$,
  'Admin records retryable cleanup work'
);
create temporary table claimed_cleanup as select * from public.doc_claim_media_cleanup('b2000000-0000-4000-8000-000000000001', 100);
select is((select count(*) from claimed_cleanup), 1::bigint, 'Admin claims bounded cleanup work');
select lives_ok($$select public.doc_fail_media_cleanup((select claim_token from claimed_cleanup limit 1), array[(select object_key from claimed_cleanup limit 1)], 'retry later')$$, 'Cleanup failure releases the claim');
select is((select attempt_count from public.doc_media_cleanup), 1, 'Cleanup failure increments the attempt once');
create temporary table claimed_cleanup_again as select * from public.doc_claim_media_cleanup('b2000000-0000-4000-8000-000000000001', 100);
select lives_ok($$select public.doc_complete_media_cleanup((select claim_token from claimed_cleanup_again limit 1), array[(select object_key from claimed_cleanup_again limit 1)])$$, 'Cleanup complete removes the claimed row');
select is((select count(*) from public.doc_media_cleanup), 0::bigint, 'Completed cleanup has no remaining row');

insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('b3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', 'docs/b2000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-000000000002.webp', 'https://media.test/old.webp', 'image/webp', 26, 1, 1);
select throws_ok(
  $$select * from public.doc_prepare_document_save('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'มีรูปหลงเหลือ', 'm06-document', null, '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[{"id":"b3000000-0000-4000-8000-000000000003"}]'::jsonb)$$,
  '23514', null, 'Prepared save rejects newly uploaded media that content does not reference'
);
select throws_ok(
  $$select * from public.doc_save_document('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'เขียนข้ามขั้นตอน', 'm06-document', null, '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb)$$,
  'P0003', null, 'Direct save cannot orphan existing media'
);
create temporary table prepared_save as select * from public.doc_prepare_document_save(
  'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'เอกสาร M06 ใหม่', 'm06-document', null,
  '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
);
select ok((select operation_id is not null and finalized is false from prepared_save), 'Removing existing media prepares a durable save operation');
select is((select title from public.doc_documents where id = 'b2000000-0000-4000-8000-000000000001'), 'เอกสาร M06', 'Prepared save keeps prior document state');
select throws_ok($$select * from public.doc_prepare_document_save('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'เขียนซ้อน', 'm06-document', null, '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb)$$, 'P0003', null, 'Pending save freezes concurrent save');
select lives_ok($$select * from public.doc_finalize_document_save((select operation_id from prepared_save))$$, 'Finalized save applies the staged document');
select is((select title from public.doc_documents where id = 'b2000000-0000-4000-8000-000000000001'), 'เอกสาร M06 ใหม่', 'Finalized save updates document once');
select is((select count(*) from public.doc_media where document_id = 'b2000000-0000-4000-8000-000000000001'), 0::bigint, 'Finalized save removes old media metadata');
reset role;

select * from finish();
rollback;
