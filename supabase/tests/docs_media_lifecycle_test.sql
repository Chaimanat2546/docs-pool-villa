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

insert into public.doc_documents (id, section_id, title, slug) values
  ('d2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'M06 Delete Media Freeze', 'm06-delete-media-freeze');
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'docs/d2000000-0000-4000-8000-000000000001/d3000000-0000-4000-8000-000000000001.webp', 'https://media.test/m06-delete-media-freeze.webp', 'image/webp', 26, 1, 1);
create temporary table prepared_document_delete_media_freeze as
select * from public.doc_prepare_document_delete('d2000000-0000-4000-8000-000000000001', 1);
select throws_ok(
  $test$do $expect_guard$
    begin
      insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
      values ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'docs/d2000000-0000-4000-8000-000000000001/d3000000-0000-4000-8000-000000000002.webp', 'https://media.test/m06-delete-late.webp', 'image/webp', 26, 1, 1);
      raise exception 'Expected frozen document media guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Document-delete preparation blocks adding media after its manifest is frozen'
);
reset role;
alter table public.doc_media disable trigger doc_media_reject_pending_section_delete;
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'docs/d2000000-0000-4000-8000-000000000001/d3000000-0000-4000-8000-000000000002.webp', 'https://media.test/m06-delete-late.webp', 'image/webp', 26, 1, 1);
alter table public.doc_media enable trigger doc_media_reject_pending_section_delete;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_finalize_document_delete((select operation_id from prepared_document_delete_media_freeze));
      raise exception 'Expected document delete media manifest guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0001', null, 'Document-delete finalizer rejects current media that is not in its frozen manifest'
);
select is((select count(*) from public.doc_media where document_id = 'd2000000-0000-4000-8000-000000000001'), 2::bigint, 'Document-delete media mismatch preserves current metadata');

insert into public.doc_documents (id, section_id, title, slug, content) values
  ('d2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'M06 Save Media Freeze', 'm06-save-media-freeze', '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"d3000000-0000-4000-8000-000000000003","alt":"freeze"}}]}'::jsonb);
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('d3000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'docs/d2000000-0000-4000-8000-000000000003/d3000000-0000-4000-8000-000000000003.webp', 'https://media.test/m06-save-media-freeze.webp', 'image/webp', 26, 1, 1);
create temporary table prepared_document_save_media_freeze as
select * from public.doc_prepare_document_save(
  'd2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001',
  'M06 Save Media Freeze', 'm06-save-media-freeze', null, '{"type":"doc","content":[]}'::jsonb,
  'draft', 0, 1, '[]'::jsonb
);
select throws_ok(
  $test$do $expect_guard$
    begin
      update public.doc_media
      set object_key = 'docs/d2000000-0000-4000-8000-000000000003/d3000000-0000-4000-8000-000000000003-renamed.webp'
      where id = 'd3000000-0000-4000-8000-000000000003';
      raise exception 'Expected frozen document media guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Save-remove preparation blocks changing the frozen media object key'
);
reset role;
alter table public.doc_media disable trigger doc_media_reject_pending_section_delete;
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('d3000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000003', 'docs/d2000000-0000-4000-8000-000000000003/d3000000-0000-4000-8000-000000000004.webp', 'https://media.test/m06-save-late.webp', 'image/webp', 26, 1, 1);
alter table public.doc_media enable trigger doc_media_reject_pending_section_delete;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_finalize_document_save((select operation_id from prepared_document_save_media_freeze));
      raise exception 'Expected save remove media manifest guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0001', null, 'Save-remove finalizer rejects current removable media that is not in its frozen manifest'
);
select is((select count(*) from public.doc_media where document_id = 'd2000000-0000-4000-8000-000000000003'), 2::bigint, 'Save-remove media mismatch preserves current metadata');

insert into public.doc_sections (id, parent_id, title, slug) values
  ('c1000000-0000-4000-8000-000000000001', null, 'M06 Pending Root', 'm06-pending-root'),
  ('c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'M06 Pending Child', 'm06-pending-child'),
  ('c1000000-0000-4000-8000-000000000003', null, 'M06 Outside Root', 'm06-outside-root');
insert into public.doc_documents (id, section_id, title, slug) values
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'M06 Move Candidate', 'm06-move-candidate');

insert into public.doc_sections (id, parent_id, title, slug) values
  ('c1000000-0000-4000-8000-000000000009', null, 'M06 Overlap Root First', 'm06-overlap-root-first'),
  ('c1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000009', 'M06 Overlap Root First Child', 'm06-overlap-root-first-child'),
  ('c1000000-0000-4000-8000-000000000011', null, 'M06 Overlap Child First', 'm06-overlap-child-first'),
  ('c1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000011', 'M06 Overlap Child First Child', 'm06-overlap-child-first-child'),
  ('c1000000-0000-4000-8000-000000000013', null, 'M06 Disjoint One', 'm06-disjoint-one'),
  ('c1000000-0000-4000-8000-000000000014', null, 'M06 Disjoint Two', 'm06-disjoint-two');
create temporary table prepared_overlap_root_first as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000009',
  'M06 Overlap Root First'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_prepare_section_delete(
        'c1000000-0000-4000-8000-000000000010',
        'M06 Overlap Root First Child'
      );
      raise exception 'Expected overlapping section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Preparing a child section delete is rejected while its parent section delete is pending'
);
select is(
  (select count(*) from public.doc_media_operations where kind = 'section_delete' and section_id in ('c1000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000010')),
  1::bigint,
  'Root-first overlap rejection preserves only the original operation'
);
select lives_ok(
  $$select * from public.doc_finalize_section_delete((select operation_id from prepared_overlap_root_first))$$,
  'Root-first overlapping rejection leaves the original delete operation finalizable'
);

create temporary table prepared_overlap_child_first as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000012',
  'M06 Overlap Child First Child'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_prepare_section_delete(
        'c1000000-0000-4000-8000-000000000011',
        'M06 Overlap Child First'
      );
      raise exception 'Expected overlapping section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Preparing a parent section delete is rejected while its child section delete is pending'
);
select lives_ok(
  $$select * from public.doc_finalize_section_delete((select operation_id from prepared_overlap_child_first))$$,
  'Child-first overlapping rejection leaves the original delete operation finalizable'
);
create temporary table prepared_overlap_parent_after_child as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000011',
  'M06 Overlap Child First'
);
select lives_ok(
  $$select * from public.doc_finalize_section_delete((select operation_id from prepared_overlap_parent_after_child))$$,
  'Parent section can be deleted after the child operation finishes'
);

create temporary table prepared_disjoint_one as
select * from public.doc_prepare_section_delete('c1000000-0000-4000-8000-000000000013', 'M06 Disjoint One');
create temporary table prepared_disjoint_two as
select * from public.doc_prepare_section_delete('c1000000-0000-4000-8000-000000000014', 'M06 Disjoint Two');
select is(
  (select count(*) from public.doc_media_operations where kind = 'section_delete' and section_id in ('c1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000014')),
  2::bigint,
  'Disjoint section deletes may be prepared concurrently'
);
select lives_ok($$select * from public.doc_finalize_section_delete((select operation_id from prepared_disjoint_one))$$, 'First disjoint section delete remains finalizable');
select lives_ok($$select * from public.doc_finalize_section_delete((select operation_id from prepared_disjoint_two))$$, 'Second disjoint section delete remains finalizable');

create temporary table prepared_empty_section_delete as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000001',
  'M06 Pending Root'
);
select is((select document_count from prepared_empty_section_delete), 0::bigint, 'Empty section delete freezes an empty document set');
select throws_ok(
  $test$do $expect_guard$
    begin
      update public.doc_media_operations
      set section_id = 'c1000000-0000-4000-8000-000000000003'
      where id = (select operation_id from prepared_empty_section_delete);
      raise exception 'Expected immutable media operation target.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete operation cannot be retargeted after its snapshot is frozen'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_prepare_document_save(
        'c2000000-0000-4000-8000-000000000002',
        'c1000000-0000-4000-8000-000000000002',
        'M06 Blocked Create', 'm06-blocked-create', null,
        '{"type":"doc","content":[]}'::jsonb, 'draft', 0, null, '[]'::jsonb
      );
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks document creation through the prepare/save lifecycle'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_save_document(
        'c2000000-0000-4000-8000-000000000003',
        'c1000000-0000-4000-8000-000000000001',
        'M06 Blocked Direct Save', 'm06-blocked-direct-save', null,
        '{"type":"doc","content":[]}'::jsonb, 'draft', 0, null, '[]'::jsonb
      );
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks direct document save into its root'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_prepare_document_save(
        'c2000000-0000-4000-8000-000000000001',
        'c1000000-0000-4000-8000-000000000002',
        'M06 Blocked Move', 'm06-move-candidate', null,
        '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
      );
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks moving an existing document into its child'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      insert into public.doc_sections (id, parent_id, title, slug)
      values ('c1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', 'M06 Late Child', 'm06-late-child');
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks adding a section to its subtree'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      update public.doc_sections
      set parent_id = 'c1000000-0000-4000-8000-000000000001'
      where id = 'c1000000-0000-4000-8000-000000000003';
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks moving a section into its subtree'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      delete from public.doc_sections
      where id = 'c1000000-0000-4000-8000-000000000002';
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks removing an empty child from its subtree'
);

reset role;
do $block$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_documents'::regclass
      and tgname = 'doc_documents_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_documents disable trigger doc_documents_reject_pending_section_delete';
  end if;
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_media'::regclass
      and tgname = 'doc_media_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_media disable trigger doc_media_reject_pending_section_delete';
  end if;
end
$block$;
insert into public.doc_documents (id, section_id, title, slug) values
  ('c2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002', 'M06 Late Document', 'm06-late-document');
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('c3000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000004', 'docs/c2000000-0000-4000-8000-000000000004/c3000000-0000-4000-8000-000000000004.webp', 'https://media.test/m06-late-document.webp', 'image/webp', 26, 1, 1);
do $block$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_documents'::regclass
      and tgname = 'doc_documents_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_documents enable trigger doc_documents_reject_pending_section_delete';
  end if;
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_media'::regclass
      and tgname = 'doc_media_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_media enable trigger doc_media_reject_pending_section_delete';
  end if;
end
$block$;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_finalize_section_delete((select operation_id from prepared_empty_section_delete));
      raise exception 'Expected section delete snapshot guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0001', null, 'Section finalizer fails closed when the current document set differs from its snapshot'
);
select is(
  (select count(*) from public.doc_media_operations where id = (select operation_id from prepared_empty_section_delete)),
  1::bigint,
  'Document-set mismatch keeps the durable section delete operation for retry'
);

insert into public.doc_sections (id, title, slug) values
  ('c1000000-0000-4000-8000-000000000004', 'M06 Media Guard Root', 'm06-media-guard-root');
insert into public.doc_documents (id, section_id, title, slug) values
  ('c2000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004', 'M06 Media Guard Document', 'm06-media-guard-document');
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('c3000000-0000-4000-8000-000000000005', 'c2000000-0000-4000-8000-000000000005', 'docs/c2000000-0000-4000-8000-000000000005/c3000000-0000-4000-8000-000000000005.webp', 'https://media.test/m06-snapshot.webp', 'image/webp', 26, 1, 1);
create temporary table prepared_media_guard_section_delete as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000004',
  'M06 Media Guard Root'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      update public.doc_media_operation_items
      set object_key = 'docs/c2000000-0000-4000-8000-000000000001/c3000000-0000-4000-8000-000000000005.webp'
      where operation_id = (select operation_id from prepared_media_guard_section_delete);
      raise exception 'Expected immutable operation manifest.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Prepared section delete media manifest cannot be retargeted'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      delete from public.doc_media_operation_documents
      where operation_id = (select operation_id from prepared_media_guard_section_delete);
      raise exception 'Expected immutable operation snapshot.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Prepared section delete document snapshot cannot be removed'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      update public.doc_media
      set document_id = 'c2000000-0000-4000-8000-000000000001'
      where id = 'c3000000-0000-4000-8000-000000000005';
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks moving manifested media out of its document set'
);
select throws_ok(
  $test$do $expect_guard$
    begin
      insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height)
      values (
        'c3000000-0000-4000-8000-000000000008',
        'c2000000-0000-4000-8000-000000000005',
        'docs/c2000000-0000-4000-8000-000000000005/c3000000-0000-4000-8000-000000000008.webp',
        'https://media.test/m06-blocked-late-media.webp',
        'image/webp', 26, 1, 1
      );
      raise exception 'Expected pending section delete guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Pending section delete blocks adding media outside its exact manifest'
);
reset role;
do $block$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_media'::regclass
      and tgname = 'doc_media_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_media disable trigger doc_media_reject_pending_section_delete';
  end if;
end
$block$;
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('c3000000-0000-4000-8000-000000000006', 'c2000000-0000-4000-8000-000000000005', 'docs/c2000000-0000-4000-8000-000000000005/c3000000-0000-4000-8000-000000000006.webp', 'https://media.test/m06-late-media.webp', 'image/webp', 26, 1, 1);
do $block$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.doc_media'::regclass
      and tgname = 'doc_media_reject_pending_section_delete'
  ) then
    execute 'alter table public.doc_media enable trigger doc_media_reject_pending_section_delete';
  end if;
end
$block$;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_finalize_section_delete((select operation_id from prepared_media_guard_section_delete));
      raise exception 'Expected section delete manifest guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0001', null, 'Section finalizer fails closed when the current media set differs from its manifest'
);
select is(
  (select count(*) from public.doc_media where document_id = 'c2000000-0000-4000-8000-000000000005'),
  2::bigint,
  'Media-set mismatch preserves every current media row'
);

insert into public.doc_sections (id, title, slug) values
  ('c1000000-0000-4000-8000-000000000008', 'M06 Exact Finalize Root', 'm06-exact-finalize-root');
insert into public.doc_documents (id, section_id, title, slug) values
  ('c2000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000008', 'M06 Exact Finalize Document', 'm06-exact-finalize-document');
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('c3000000-0000-4000-8000-000000000009', 'c2000000-0000-4000-8000-000000000008', 'docs/c2000000-0000-4000-8000-000000000008/c3000000-0000-4000-8000-000000000009.webp', 'https://media.test/m06-exact-finalize.webp', 'image/webp', 26, 1, 1);
create temporary table prepared_exact_section_delete as
select * from public.doc_prepare_section_delete(
  'c1000000-0000-4000-8000-000000000008',
  'M06 Exact Finalize Root'
);
select lives_ok(
  $$select * from public.doc_finalize_section_delete((select operation_id from prepared_exact_section_delete))$$,
  'Section finalizer deletes the exact unchanged document and media snapshot'
);
select is(
  (select count(*) from public.doc_sections where id = 'c1000000-0000-4000-8000-000000000008'),
  0::bigint,
  'Exact section finalize removes the target section'
);
select is(
  (select count(*) from public.doc_documents where id = 'c2000000-0000-4000-8000-000000000008'),
  0::bigint,
  'Exact section finalize removes the frozen document'
);
select is(
  (select count(*) from public.doc_media where id = 'c3000000-0000-4000-8000-000000000009'),
  0::bigint,
  'Exact section finalize removes the manifested media row'
);

insert into public.doc_sections (id, title, slug) values
  ('c1000000-0000-4000-8000-000000000005', 'M06 Staged Destination', 'm06-staged-destination'),
  ('c1000000-0000-4000-8000-000000000006', 'M06 Staged Source', 'm06-staged-source');
insert into public.doc_documents (id, section_id, title, slug, content) values
  (
    'c2000000-0000-4000-8000-000000000006',
    'c1000000-0000-4000-8000-000000000006',
    'M06 Staged Move',
    'm06-staged-move',
    '{"type":"doc","content":[{"type":"image","attrs":{"mediaId":"c3000000-0000-4000-8000-000000000007","alt":"staged move"}}]}'::jsonb
  );
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('c3000000-0000-4000-8000-000000000007', 'c2000000-0000-4000-8000-000000000006', 'docs/c2000000-0000-4000-8000-000000000006/c3000000-0000-4000-8000-000000000007.webp', 'https://media.test/m06-staged-move.webp', 'image/webp', 26, 1, 1);
create temporary table prepared_staged_move as
select * from public.doc_prepare_document_save(
  'c2000000-0000-4000-8000-000000000006',
  'c1000000-0000-4000-8000-000000000005',
  'M06 Staged Move', 'm06-staged-move', null,
  '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
);
select ok((select operation_id is not null and finalized is false from prepared_staged_move), 'Move with media removal persists its staged destination');
select throws_ok(
  $test$do $expect_guard$
    begin
      perform * from public.doc_prepare_section_delete('c1000000-0000-4000-8000-000000000005', 'M06 Staged Destination');
      raise exception 'Expected staged destination guard.' using errcode = 'P0999';
    end
  $expect_guard$$test$,
  'P0003', null, 'Section delete preparation rejects a pending save staged to move into its subtree'
);
reset role;

select * from finish();
rollback;
