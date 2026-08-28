begin;

do $$
declare
  v_document_ids uuid[] := array[
    'f6200000-0000-4000-8000-000000000001'::uuid,
    'f6500000-0000-4000-8000-000000000001'::uuid,
    'f6900000-0000-4000-8000-000000000001'::uuid,
    'f6d00000-0000-4000-8000-000000000001'::uuid,
    'f7100000-0000-4000-8000-000000000001'::uuid
  ];
begin
  if exists (select 1 from public.doc_media where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target media remains';
  end if;
  if exists (select 1 from public.doc_media_operations where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target operation remains';
  end if;
  if exists (select 1 from public.doc_media_cleanup where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target cleanup record remains';
  end if;
end
$$;

delete from public.doc_route_redirects where document_id = any(array[
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
]);

delete from public.doc_documents where id = any(array[
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
]);

delete from public.doc_sections where id = any(array[
  'f6100000-0000-4000-8000-000000000001'::uuid,
  'f6400000-0000-4000-8000-000000000001'::uuid,
  'f6800000-0000-4000-8000-000000000001'::uuid,
  'f6c00000-0000-4000-8000-000000000001'::uuid,
  'f7000000-0000-4000-8000-000000000001'::uuid
]);

commit;
