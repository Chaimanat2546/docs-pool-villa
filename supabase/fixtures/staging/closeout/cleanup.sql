begin;

do $$
declare
  v_section_ids uuid[] := array[
    'fa100000-0000-4000-8000-000000000001'::uuid,
    'fa100000-0000-4000-8000-000000000002'::uuid,
    'fa100000-0000-4000-8000-000000000003'::uuid
  ];
  v_document_ids uuid[] := array[
    'fa200000-0000-4000-8000-000000000001'::uuid,
    'fa200000-0000-4000-8000-000000000002'::uuid,
    'fa200000-0000-4000-8000-000000000003'::uuid,
    'fa200000-0000-4000-8000-000000000004'::uuid,
    'fa200000-0000-4000-8000-000000000005'::uuid,
    'fa200000-0000-4000-8000-000000000006'::uuid,
    'fa200000-0000-4000-8000-000000000007'::uuid
  ];
begin
  if exists (select 1 from public.doc_media where document_id = any(v_document_ids)) then
    raise exception 'Closeout cleanup blocked: target media remains';
  end if;
  if exists (
    select 1 from public.doc_media_operations
    where document_id = any(v_document_ids) or section_id = any(v_section_ids)
  ) then
    raise exception 'Closeout cleanup blocked: target operation remains';
  end if;
  if exists (select 1 from public.doc_media_cleanup where document_id = any(v_document_ids)) then
    raise exception 'Closeout cleanup blocked: target cleanup record remains';
  end if;
end
$$;

delete from public.doc_route_redirects
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid
]);

delete from public.doc_documents where id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid
]);

delete from public.doc_sections
where id in (
  'fa100000-0000-4000-8000-000000000002'::uuid,
  'fa100000-0000-4000-8000-000000000003'::uuid
);
delete from public.doc_sections
where id = 'fa100000-0000-4000-8000-000000000001'::uuid;

commit;
