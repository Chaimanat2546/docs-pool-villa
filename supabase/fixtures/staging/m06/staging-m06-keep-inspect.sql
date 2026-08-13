-- Read-only inspection for the deliberately retained M06 Staging Keep records.
select
  document.id as document_id,
  document.title,
  document.version,
  (select count(*) from public.doc_media as media where media.document_id = document.id) as media_count,
  operation.id as operation_id,
  operation.kind,
  operation.attempt_count,
  operation.last_error,
  (select count(*) from public.doc_media_operation_items as item where item.operation_id = operation.id) as manifest_item_count,
  has_table_privilege('anon', 'public.doc_media_operations', 'select') as anon_can_read_operations,
  has_function_privilege('anon', 'public.doc_prepare_document_save(uuid,uuid,text,text,text,jsonb,text,integer,bigint,jsonb)'::regprocedure, 'execute') as anon_can_prepare_save,
  has_function_privilege('authenticated', 'public.doc_prepare_document_save(uuid,uuid,text,text,text,jsonb,text,integer,bigint,jsonb)'::regprocedure, 'execute') as authenticated_can_prepare_save
from public.doc_documents as document
left join public.doc_media_operations as operation on operation.document_id = document.id
where document.id = 'f6200000-0000-4000-8000-000000000001';
