with closeout_sections(id) as (values
  ('fa100000-0000-4000-8000-000000000001'::uuid),
  ('fa100000-0000-4000-8000-000000000002'::uuid),
  ('fa100000-0000-4000-8000-000000000003'::uuid)
), retained_sections(id) as (values
  ('f6100000-0000-4000-8000-000000000001'::uuid),
  ('f6400000-0000-4000-8000-000000000001'::uuid),
  ('f6800000-0000-4000-8000-000000000001'::uuid),
  ('f6c00000-0000-4000-8000-000000000001'::uuid),
  ('f7000000-0000-4000-8000-000000000001'::uuid)
), closeout_documents(id) as (values
  ('fa200000-0000-4000-8000-000000000001'::uuid),
  ('fa200000-0000-4000-8000-000000000002'::uuid),
  ('fa200000-0000-4000-8000-000000000003'::uuid),
  ('fa200000-0000-4000-8000-000000000004'::uuid),
  ('fa200000-0000-4000-8000-000000000005'::uuid),
  ('fa200000-0000-4000-8000-000000000006'::uuid),
  ('fa200000-0000-4000-8000-000000000007'::uuid)
), retained_documents(id) as (values
  ('f6200000-0000-4000-8000-000000000001'::uuid),
  ('f6500000-0000-4000-8000-000000000001'::uuid),
  ('f6900000-0000-4000-8000-000000000001'::uuid),
  ('f6d00000-0000-4000-8000-000000000001'::uuid),
  ('f7100000-0000-4000-8000-000000000001'::uuid)
), target_sections as (
  select id from closeout_sections union all select id from retained_sections
), target_documents as (
  select id from closeout_documents union all select id from retained_documents
)
select 'closeout_sections' as metric, count(*)::text as value
from public.doc_sections where id in (select id from closeout_sections)
union all
select 'closeout_documents', count(*)::text
from public.doc_documents where id in (select id from closeout_documents)
union all
select 'retained_m06_sections', count(*)::text
from public.doc_sections where id in (select id from retained_sections)
union all
select 'retained_m06_documents', count(*)::text
from public.doc_documents where id in (select id from retained_documents)
union all
select 'target_media', count(*)::text
from public.doc_media where document_id in (select id from target_documents)
union all
select 'target_redirects', count(*)::text
from public.doc_route_redirects where document_id in (select id from target_documents)
union all
select 'target_operations', count(*)::text
from public.doc_media_operations
where document_id in (select id from target_documents)
   or section_id in (select id from target_sections)
union all
select 'target_operation_documents', count(*)::text
from public.doc_media_operation_documents as operation_document
join public.doc_media_operations as operation on operation.id = operation_document.operation_id
where operation.document_id in (select id from target_documents)
   or operation.section_id in (select id from target_sections)
union all
select 'target_operation_items', count(*)::text
from public.doc_media_operation_items as item
join public.doc_media_operations as operation on operation.id = item.operation_id
where operation.document_id in (select id from target_documents)
   or operation.section_id in (select id from target_sections)
union all
select 'target_cleanup', count(*)::text
from public.doc_media_cleanup where document_id in (select id from target_documents)
union all
select 'non_target_section_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_sections where id not in (select id from target_sections)
union all
select 'non_target_document_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_documents where id not in (select id from target_documents)
union all
select 'non_target_media_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media where document_id not in (select id from target_documents)
union all
select 'non_target_redirect_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_route_redirects
where document_id is null or document_id not in (select id from target_documents)
union all
select 'non_target_operation_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media_operations
where (document_id is null or document_id not in (select id from target_documents))
  and (section_id is null or section_id not in (select id from target_sections))
union all
select 'non_target_operation_document_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(
    operation_document.operation_id::text || ':' || operation_document.document_id::text,
    ',' order by operation_document.operation_id, operation_document.document_id
  )), '')
from public.doc_media_operation_documents as operation_document
join public.doc_media_operations as operation on operation.id = operation_document.operation_id
where (operation.document_id is null or operation.document_id not in (select id from target_documents))
  and (operation.section_id is null or operation.section_id not in (select id from target_sections))
union all
select 'non_target_operation_item_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(
    item.operation_id::text || ':' || item.media_id::text,
    ',' order by item.operation_id, item.media_id
  )), '')
from public.doc_media_operation_items as item
join public.doc_media_operations as operation on operation.id = item.operation_id
where (operation.document_id is null or operation.document_id not in (select id from target_documents))
  and (operation.section_id is null or operation.section_id not in (select id from target_sections))
union all
select 'non_target_cleanup_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media_cleanup where document_id not in (select id from target_documents);

select id as media_id, document_id, object_key, public_url
from public.doc_media
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
order by document_id, id;

select id as operation_id, kind, document_id, section_id, attempt_count, last_error
from public.doc_media_operations
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
or section_id = any(array[
  'fa100000-0000-4000-8000-000000000001'::uuid,
  'fa100000-0000-4000-8000-000000000002'::uuid,
  'fa100000-0000-4000-8000-000000000003'::uuid,
  'f6100000-0000-4000-8000-000000000001'::uuid,
  'f6400000-0000-4000-8000-000000000001'::uuid,
  'f6800000-0000-4000-8000-000000000001'::uuid,
  'f6c00000-0000-4000-8000-000000000001'::uuid,
  'f7000000-0000-4000-8000-000000000001'::uuid
])
order by id;

select id as cleanup_id, document_id, object_key, display_label, attempt_count, last_error
from public.doc_media_cleanup
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
order by document_id, id;
