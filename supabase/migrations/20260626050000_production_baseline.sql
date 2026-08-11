

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "private"."canonical_quotation_layout"("p_template_key" "text") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'private'
    AS $$
  select case
    when p_template_key in ('current', 'hospitality', 'corporate') then
      jsonb_build_object(
        'schemaVersion', 2,
        'themeColor', case p_template_key
          when 'current' then '#6366F1'
          when 'hospitality' then '#286A5B'
          when 'corporate' then '#142D4C'
        end,
        'blocks', private.canonical_quotation_layout_v1(p_template_key) -> 'blocks'
      )
  end;
$$;


ALTER FUNCTION "private"."canonical_quotation_layout"("p_template_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."canonical_quotation_layout_v1"("p_template_key" "text") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select case p_template_key
    when 'current' then '{"schemaVersion":1,"blocks":[{"id":"seller","zone":"header","column":1,"order":10,"span":7},{"id":"documentMetadata","zone":"header","column":8,"order":10,"span":5},{"id":"customer","zone":"body","column":1,"order":10,"span":12},{"id":"items","zone":"body","column":1,"order":20,"span":12},{"id":"paymentMethods","zone":"settlement","column":1,"order":10,"span":8},{"id":"summary","zone":"settlement","column":9,"order":10,"span":4},{"id":"publicNotes","zone":"settlement","column":1,"order":20,"span":8},{"id":"certification","zone":"certification","column":1,"order":10,"span":12}]}'::jsonb
    when 'hospitality' then '{"schemaVersion":1,"blocks":[{"id":"seller","zone":"header","column":1,"order":10,"span":7},{"id":"documentMetadata","zone":"header","column":8,"order":10,"span":5},{"id":"customer","zone":"body","column":1,"order":10,"span":12},{"id":"items","zone":"body","column":1,"order":20,"span":12},{"id":"paymentMethods","zone":"settlement","column":1,"order":10,"span":7},{"id":"summary","zone":"settlement","column":8,"order":10,"span":5},{"id":"publicNotes","zone":"settlement","column":1,"order":20,"span":7},{"id":"certification","zone":"certification","column":1,"order":10,"span":12},{"id":"sellerFooter","zone":"footer","column":1,"order":10,"span":12}]}'::jsonb
    when 'corporate' then '{"schemaVersion":1,"blocks":[{"id":"seller","zone":"header","column":1,"order":10,"span":6},{"id":"documentMetadata","zone":"header","column":7,"order":10,"span":6},{"id":"customer","zone":"body","column":1,"order":10,"span":12},{"id":"items","zone":"body","column":1,"order":20,"span":12},{"id":"paymentMethods","zone":"settlement","column":1,"order":10,"span":7},{"id":"summary","zone":"settlement","column":8,"order":10,"span":5},{"id":"publicNotes","zone":"settlement","column":1,"order":20,"span":7},{"id":"certification","zone":"certification","column":1,"order":10,"span":12}]}'::jsonb
  end;
$$;


ALTER FUNCTION "private"."canonical_quotation_layout_v1"("p_template_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_quotation_company_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select id
  from public.quotation_company_profiles
  where user_id = auth.uid()
$$;


ALTER FUNCTION "private"."current_quotation_company_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."ensure_quotation_document_templates"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_template_id uuid;
  v_template_key text;
begin
  foreach v_template_key in array array['current', 'hospitality', 'corporate'] loop
    insert into public.quotation_document_templates (user_id, template_key, current_revision_number)
    values (p_user_id, v_template_key, 1)
    on conflict (user_id, template_key) do nothing
    returning id into v_template_id;

    if found then
      insert into public.quotation_document_template_revisions (
        template_id, revision_number, layout_schema_version, layout_config, created_by
      ) values (
        v_template_id, 1, 2, private.canonical_quotation_layout(v_template_key), p_user_id
      );
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "private"."ensure_quotation_document_templates"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."get_public_quotation"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select jsonb_build_object(
    'id', q.id, 'document_number', q.document_number, 'issue_date', q.issue_date,
    'valid_until', q.valid_until, 'validity_days', q.validity_days,
    'reference', q.reference, 'subject', q.subject,
    'seller_snapshot', q.seller_snapshot, 'certification_snapshot', q.certification_snapshot,
    'document_display_snapshot', q.document_display_snapshot,
    'document_template_snapshot', q.document_template_snapshot,
    'document_template_revision_snapshot', q.document_template_revision_snapshot,
    'document_layout_schema_version_snapshot', q.document_layout_schema_version_snapshot,
    'document_layout_snapshot', q.document_layout_snapshot,
    'customer_snapshot', jsonb_build_object(
      'name', coalesce(q.customer_snapshot ->> 'name', ''),
      'address', coalesce(q.customer_snapshot ->> 'address', ''),
      'taxId', coalesce(q.customer_snapshot ->> 'taxId', ''),
      'officeType', coalesce(q.customer_snapshot ->> 'officeType', 'head_office'),
      'branchNumber', coalesce(q.customer_snapshot ->> 'branchNumber', '')
    ),
    'withholding_tax_rate', q.withholding_tax_rate, 'public_notes', q.public_notes,
    'quotation_items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'position', i.position, 'name', i.name, 'description', i.description,
      'quantity', i.quantity, 'unit', i.unit, 'unit_price', i.unit_price,
      'discount_amount', i.discount_amount, 'vat_treatment', i.vat_treatment, 'vat_rate', i.vat_rate
    ) order by i.position) from public.quotation_items i where i.quotation_id = q.id), '[]'::jsonb),
    'quotation_payment_methods', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'type', p.type, 'position', p.position,
      'bank_code', case when p.type = 'bank_transfer' then p.bank_code else '' end,
      'bank_name', case when p.type = 'bank_transfer' then p.bank_name else '' end,
      'bank_logo_url', case when p.type = 'bank_transfer' then p.bank_logo_url else '' end,
      'custom_bank_name', case when p.type = 'bank_transfer' then p.custom_bank_name else '' end,
      'custom_bank_logo_url', case when p.type = 'bank_transfer' then p.custom_bank_logo_url else '' end,
      'account_number', case when p.type = 'bank_transfer' then p.account_number else '' end,
      'account_type', case when p.type = 'bank_transfer' then p.account_type else '' end,
      'account_name', case when p.type in ('bank_transfer', 'promptpay') then p.account_name else '' end,
      'promptpay_id', case when p.type = 'promptpay' then p.promptpay_id else '' end,
      'provider_name', case when p.type in ('qr_payment', 'other') then p.provider_name else '' end,
      'instructions', p.instructions, 'qr_mode', case when p.type in ('bank_transfer', 'promptpay', 'qr_payment') then p.qr_mode else 'none' end,
      'qr_image_url', case when p.type in ('bank_transfer', 'promptpay', 'qr_payment') and p.qr_mode = 'upload' then p.qr_image_url else '' end
    ) order by p.position) from public.quotation_payment_methods p where p.quotation_id = q.id), '[]'::jsonb)
  )
  from public.quotations q
  where q.public_token = p_token
    and q.deleted_at is null
    and q.public_token_revoked_at is null
    and q.public_token_expires_at > now();
$$;


ALTER FUNCTION "private"."get_public_quotation"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_quotation_permission"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select exists (select 1 from public.users where coalesce(users.allow_tools, '{}'::jsonb) @> '{"allow_quotation": true}'::jsonb and (users.uid = auth.uid() or users.email = auth.jwt() ->> 'email'));
$$;


ALTER FUNCTION "private"."has_quotation_permission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_quotation_document_display"("value" "jsonb") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select jsonb_typeof(value) = 'object'
    and value ?& array[
      'certificationDate', 'certificationName', 'certificationQr', 'discount',
      'notes', 'preTax', 'reference', 'tax', 'unit', 'withholdingTax'
    ]
    and value
      - 'certificationDate' - 'certificationName' - 'certificationQr'
      - 'discount' - 'notes' - 'preTax' - 'reference' - 'tax' - 'unit'
      - 'withholdingTax' = '{}'::jsonb
    and not exists (
      select 1 from jsonb_each(value) entry
      where jsonb_typeof(entry.value) <> 'boolean'
    );
$$;


ALTER FUNCTION "private"."is_quotation_document_display"("value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_quotation_layout"("p_value" "jsonb", "p_template_key" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'private'
    AS $_$
  select jsonb_typeof(p_value) = 'object'
    and p_value ?& array['schemaVersion', 'blocks', 'themeColor']
    and p_value - 'schemaVersion' - 'blocks' - 'themeColor' = '{}'::jsonb
    and p_value ->> 'schemaVersion' = '2'
    and p_value ->> 'themeColor' ~ '^#[0-9A-Fa-f]{6}$'
    and private.is_quotation_layout_v1(
      jsonb_build_object(
        'schemaVersion', 1,
        'blocks', p_value -> 'blocks'
      ),
      p_template_key
    );
$_$;


ALTER FUNCTION "private"."is_quotation_layout"("p_value" "jsonb", "p_template_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_quotation_layout_v1"("p_value" "jsonb", "p_template_key" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $_$
  select p_template_key in ('current', 'hospitality', 'corporate')
    and jsonb_typeof(p_value) = 'object'
    and p_value ?& array['schemaVersion', 'blocks']
    and p_value - 'schemaVersion' - 'blocks' = '{}'::jsonb
    and p_value ->> 'schemaVersion' = '1'
    and jsonb_typeof(p_value -> 'blocks') = 'array'
    and jsonb_array_length(p_value -> 'blocks') = case when p_template_key = 'hospitality' then 9 else 8 end
    and not exists (
      select 1 from jsonb_array_elements(p_value -> 'blocks') as element(value)
      where jsonb_typeof(element.value) <> 'object'
        or not (element.value ?& array['id', 'zone', 'column', 'order', 'span'])
        or element.value - 'id' - 'zone' - 'column' - 'order' - 'span' <> '{}'::jsonb
        or element.value ->> 'id' not in ('seller', 'documentMetadata', 'customer', 'items', 'summary', 'paymentMethods', 'publicNotes', 'certification', 'sellerFooter')
        or (p_template_key <> 'hospitality' and element.value ->> 'id' = 'sellerFooter')
        or element.value ->> 'zone' not in ('header', 'body', 'settlement', 'footer', 'certification')
        or jsonb_typeof(element.value -> 'column') <> 'number'
        or jsonb_typeof(element.value -> 'order') <> 'number'
        or jsonb_typeof(element.value -> 'span') <> 'number'
        or element.value ->> 'column' !~ '^[1-9][0-9]*$'
        or element.value ->> 'order' !~ '^[1-9][0-9]*$'
        or element.value ->> 'span' !~ '^[1-9][0-9]*$'
        or (element.value ->> 'column')::integer > 12
        or (element.value ->> 'span')::integer > 12
        or (element.value ->> 'column')::integer + (element.value ->> 'span')::integer - 1 > 12
        or (element.value ->> 'order')::integer > 1000
        or mod((element.value ->> 'order')::integer, 10) <> 0
        or case element.value ->> 'id'
          when 'seller' then element.value ->> 'zone' <> 'header' or (element.value ->> 'span')::integer not in (4, 5, 6, 7, 8, 12)
          when 'documentMetadata' then element.value ->> 'zone' <> 'header' or (element.value ->> 'span')::integer not in (4, 5, 6, 7, 8, 12)
          when 'customer' then element.value ->> 'zone' <> 'body' or (element.value ->> 'span')::integer <> 12
          when 'items' then element.value ->> 'zone' <> 'body' or (element.value ->> 'span')::integer <> 12
          when 'summary' then element.value ->> 'zone' <> 'settlement' or (element.value ->> 'span')::integer not in (4, 5, 6, 7, 8, 12)
          when 'paymentMethods' then element.value ->> 'zone' <> 'settlement' or (element.value ->> 'span')::integer not in (4, 5, 6, 7, 8, 12)
          when 'publicNotes' then element.value ->> 'zone' <> 'settlement' or (element.value ->> 'span')::integer not in (4, 5, 6, 7, 8, 12)
          when 'certification' then element.value ->> 'zone' <> 'certification' or (element.value ->> 'span')::integer <> 12
          when 'sellerFooter' then element.value ->> 'zone' <> 'footer' or (element.value ->> 'span')::integer <> 12
          else true
        end
    )
    and not exists (
      select 1 from jsonb_array_elements(p_value -> 'blocks') as element(value)
      group by element.value ->> 'id' having count(*) <> 1
    )
    and not exists (
      select 1
      from jsonb_array_elements(p_value -> 'blocks') with ordinality as left_block(value, ordinal_position)
      join jsonb_array_elements(p_value -> 'blocks') with ordinality as right_block(value, ordinal_position)
        on left_block.ordinal_position < right_block.ordinal_position
      where left_block.value ->> 'zone' = right_block.value ->> 'zone'
        and left_block.value ->> 'order' = right_block.value ->> 'order'
        and (left_block.value ->> 'column')::integer <= (right_block.value ->> 'column')::integer + (right_block.value ->> 'span')::integer - 1
        and (right_block.value ->> 'column')::integer <= (left_block.value ->> 'column')::integer + (left_block.value ->> 'span')::integer - 1
    );
$_$;


ALTER FUNCTION "private"."is_quotation_layout_v1"("p_value" "jsonb", "p_template_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_quotation_template"("value" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select value in ('current', 'hospitality', 'corporate');
$$;


ALTER FUNCTION "private"."is_quotation_template"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."next_quotation_number"("p_issue_date" "date") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'private'
    AS $$
declare
  v_running integer;
begin
  insert into private.quotation_number_counters (issue_date, last_value)
  values (p_issue_date, 1)
  on conflict (issue_date) do update
    set last_value = private.quotation_number_counters.last_value + 1
  returning last_value into v_running;

  return 'QO-' || to_char(p_issue_date, 'YYYYMMDD') ||
    case when v_running < 10000
      then lpad(v_running::text, 4, '0')
      else v_running::text
    end;
end;
$$;


ALTER FUNCTION "private"."next_quotation_number"("p_issue_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."normalize_quotation_certification"("p_value" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_value jsonb := coalesce(p_value, '{}'::jsonb);
  v_issuer jsonb := coalesce(v_value -> 'issuer', '{}'::jsonb);
  v_approver jsonb := coalesce(v_value -> 'approver', '{}'::jsonb);
  v_issuer_signature text := btrim(coalesce(v_issuer ->> 'signature_url', ''));
  v_approver_signature text := btrim(coalesce(v_approver ->> 'signature_url', ''));
  v_stamp text := btrim(coalesce(v_value ->> 'company_stamp_url', ''));
  v_issuer_name text := btrim(coalesce(v_issuer ->> 'name', ''));
  v_issuer_position text := btrim(coalesce(v_issuer ->> 'position', ''));
  v_approver_name text := btrim(coalesce(v_approver ->> 'name', ''));
  v_approver_position text := btrim(coalesce(v_approver ->> 'position', ''));
begin
  if jsonb_typeof(v_value) is distinct from 'object'
    or jsonb_typeof(v_issuer) is distinct from 'object'
    or jsonb_typeof(v_approver) is distinct from 'object'
    or coalesce(jsonb_typeof(v_issuer -> 'name'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_issuer -> 'position'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_issuer -> 'signature_url'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_approver -> 'name'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_approver -> 'position'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_approver -> 'signature_url'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(v_value -> 'company_stamp_url'), 'null') not in ('string', 'null')
    or char_length(v_issuer_name) > 200
    or char_length(v_issuer_position) > 200
    or char_length(v_issuer_signature) > 2048
    or char_length(v_approver_name) > 200
    or char_length(v_approver_position) > 200
    or char_length(v_approver_signature) > 2048
    or char_length(v_stamp) > 2048
    or not private.validate_quotation_certification_asset_url(v_issuer_signature)
    or not private.validate_quotation_certification_asset_url(v_approver_signature)
    or not private.validate_quotation_certification_asset_url(v_stamp) then
    raise exception using errcode = '22023', message = 'Invalid quotation certification';
  end if;

  return jsonb_build_object(
    'issuer', jsonb_build_object(
      'name', nullif(v_issuer_name, ''),
      'position', nullif(v_issuer_position, ''),
      'signature_url', nullif(v_issuer_signature, '')
    ),
    'approver', jsonb_build_object(
      'name', nullif(v_approver_name, ''),
      'position', nullif(v_approver_position, ''),
      'signature_url', nullif(v_approver_signature, '')
    ),
    'company_stamp_url', nullif(v_stamp, '')
  );
end;
$$;


ALTER FUNCTION "private"."normalize_quotation_certification"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."provision_quotation_document_templates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  perform private.ensure_quotation_document_templates(new.user_id);
  return new;
end;
$$;


ALTER FUNCTION "private"."provision_quotation_document_templates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_id uuid;
  v_document_number text;
  v_item jsonb;
  v_updated integer;
  v_expected_gross numeric;
  v_expected_discount numeric;
  v_expected_pre_tax numeric;
  v_expected_vat numeric;
  v_expected_grand numeric;
  v_expected_withholding numeric;
  v_expected_due numeric;
begin
  if not private.has_quotation_permission() then raise exception using errcode = '42501', message = 'Unauthorized'; end if;
  if jsonb_typeof(p_payload -> 'items') is distinct from 'array' or jsonb_array_length(p_payload -> 'items') not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Quotation requires 1 to 100 items';
  end if;
  select sum(item.gross), sum(item.discount), sum(item.gross - item.discount), sum(case when item.vat_treatment = 'taxable' then round((item.gross - item.discount) * item.vat_rate / 100, 2) else 0 end)
  into v_expected_gross, v_expected_discount, v_expected_pre_tax, v_expected_vat
  from (
    select round((value ->> 'quantity')::numeric(12,3) * (value ->> 'unit_price')::numeric(14,2), 2) as gross, (value ->> 'discount_amount')::numeric(14,2) as discount, value ->> 'vat_treatment' as vat_treatment, (value ->> 'vat_rate')::numeric(5,2) as vat_rate
    from jsonb_array_elements(p_payload -> 'items')
  ) item;
  v_expected_grand := v_expected_pre_tax + v_expected_vat;
  v_expected_withholding := round(v_expected_pre_tax * coalesce(nullif(p_payload ->> 'withholding_tax_rate', '')::numeric(5,2), 0) / 100, 2);
  v_expected_due := v_expected_grand - v_expected_withholding;
  if (p_payload #>> '{totals,grossTotal}')::numeric(14,2) is distinct from v_expected_gross
    or (p_payload #>> '{totals,discountTotal}')::numeric(14,2) is distinct from v_expected_discount
    or (p_payload #>> '{totals,preTaxTotal}')::numeric(14,2) is distinct from v_expected_pre_tax
    or (p_payload #>> '{totals,vatTotal}')::numeric(14,2) is distinct from v_expected_vat
    or (p_payload #>> '{totals,grandTotal}')::numeric(14,2) is distinct from v_expected_grand
    or (p_payload #>> '{totals,withholdingTaxTotal}')::numeric(14,2) is distinct from v_expected_withholding
    or (p_payload #>> '{totals,amountDue}')::numeric(14,2) is distinct from v_expected_due then
    raise exception using errcode = '23514', message = 'Quotation totals do not match items';
  end if;
  v_id := nullif(p_payload ->> 'id', '')::uuid;
  if v_id is null then
    v_id := gen_random_uuid();
    v_document_number := private.next_quotation_number((p_payload ->> 'issue_date')::date);
    insert into public.quotations (
      id, document_number, issue_date, valid_until, validity_days, reference, subject,
      seller_snapshot, customer_snapshot, gross_total, discount_total, pre_tax_total,
      vat_total, grand_total, withholding_tax_rate, withholding_tax_total, amount_due,
      public_notes, internal_notes, document_template_snapshot,
      document_template_source_id, document_template_revision_snapshot,
      document_layout_schema_version_snapshot, document_layout_snapshot, created_by, updated_by
    ) values (
      v_id, v_document_number, (p_payload ->> 'issue_date')::date, (p_payload ->> 'valid_until')::date,
      nullif(p_payload ->> 'validity_days', '')::integer, coalesce(p_payload ->> 'reference', ''),
      coalesce(p_payload ->> 'subject', ''), p_payload -> 'seller_snapshot', p_payload -> 'customer_snapshot',
      (p_payload #>> '{totals,grossTotal}')::numeric, (p_payload #>> '{totals,discountTotal}')::numeric,
      (p_payload #>> '{totals,preTaxTotal}')::numeric, (p_payload #>> '{totals,vatTotal}')::numeric,
      (p_payload #>> '{totals,grandTotal}')::numeric, nullif(p_payload ->> 'withholding_tax_rate', '')::numeric,
      (p_payload #>> '{totals,withholdingTaxTotal}')::numeric, (p_payload #>> '{totals,amountDue}')::numeric,
      coalesce(p_payload ->> 'public_notes', ''), coalesce(p_payload ->> 'internal_notes', ''),
      p_payload ->> 'document_template_snapshot', nullif(p_payload ->> 'document_template_source_id', '')::uuid,
      nullif(p_payload ->> 'document_template_revision_snapshot', '')::bigint,
      nullif(p_payload ->> 'document_layout_schema_version_snapshot', '')::integer,
      p_payload -> 'document_layout_snapshot', auth.uid(), auth.uid()
    );
  else
    update public.quotations set
      issue_date = (p_payload ->> 'issue_date')::date,
      valid_until = (p_payload ->> 'valid_until')::date,
      validity_days = nullif(p_payload ->> 'validity_days', '')::integer,
      reference = coalesce(p_payload ->> 'reference', ''),
      subject = coalesce(p_payload ->> 'subject', ''),
      seller_snapshot = p_payload -> 'seller_snapshot',
      customer_snapshot = p_payload -> 'customer_snapshot',
      gross_total = (p_payload #>> '{totals,grossTotal}')::numeric,
      discount_total = (p_payload #>> '{totals,discountTotal}')::numeric,
      pre_tax_total = (p_payload #>> '{totals,preTaxTotal}')::numeric,
      vat_total = (p_payload #>> '{totals,vatTotal}')::numeric,
      grand_total = (p_payload #>> '{totals,grandTotal}')::numeric,
      withholding_tax_rate = nullif(p_payload ->> 'withholding_tax_rate', '')::numeric,
      withholding_tax_total = (p_payload #>> '{totals,withholdingTaxTotal}')::numeric,
      amount_due = (p_payload #>> '{totals,amountDue}')::numeric,
      public_notes = coalesce(p_payload ->> 'public_notes', ''),
      internal_notes = coalesce(p_payload ->> 'internal_notes', ''),
      document_template_snapshot = p_payload ->> 'document_template_snapshot',
      document_template_source_id = nullif(p_payload ->> 'document_template_source_id', '')::uuid,
      document_template_revision_snapshot = nullif(p_payload ->> 'document_template_revision_snapshot', '')::bigint,
      document_layout_schema_version_snapshot = nullif(p_payload ->> 'document_layout_schema_version_snapshot', '')::integer,
      document_layout_snapshot = p_payload -> 'document_layout_snapshot',
      updated_by = auth.uid(), updated_at = now()
    where quotations.id = v_id and quotations.created_by = auth.uid() and quotations.deleted_at is null
    returning quotations.document_number into v_document_number;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception using errcode = 'P0002', message = 'Quotation not found'; end if;
    delete from public.quotation_items where quotation_id = v_id;
  end if;
  for v_item in select value from jsonb_array_elements(p_payload -> 'items') loop
    insert into public.quotation_items (quotation_id, position, name, description, quantity, unit, unit_price, discount_amount, vat_treatment, vat_rate)
    values (v_id, (v_item ->> 'position')::integer, v_item ->> 'name', coalesce(v_item ->> 'description', ''), (v_item ->> 'quantity')::numeric, nullif(v_item ->> 'unit', ''), (v_item ->> 'unit_price')::numeric, (v_item ->> 'discount_amount')::numeric, v_item ->> 'vat_treatment', (v_item ->> 'vat_rate')::numeric);
  end loop;
  return query select v_id, v_document_number;
end;
$$;


ALTER FUNCTION "private"."save_quotation"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation_company_certification"("p_value" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_certification jsonb;
  v_profile_id uuid;
begin
  if not private.has_quotation_permission() then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;
  v_certification := private.normalize_quotation_certification(p_value);
  update public.quotation_company_profiles
  set issuer_name = v_certification #>> '{issuer,name}',
      issuer_position = v_certification #>> '{issuer,position}',
      issuer_signature_url = v_certification #>> '{issuer,signature_url}',
      approver_name = v_certification #>> '{approver,name}',
      approver_position = v_certification #>> '{approver,position}',
      approver_signature_url = v_certification #>> '{approver,signature_url}',
      company_stamp_url = v_certification ->> 'company_stamp_url',
      updated_at = now()
  where user_id = auth.uid()
  returning id into v_profile_id;
  if v_profile_id is null then
    raise exception using errcode = 'P0002', message = 'Quotation company profile not found';
  end if;
  return v_profile_id;
end;
$$;


ALTER FUNCTION "private"."save_quotation_company_certification"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_quotation_payment_asset_url"("p_url" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'private'
    AS $_$
declare v_origin text;
begin
  if coalesce(btrim(p_url), '') = '' then return true; end if;
  select origin into v_origin from private.quotation_payment_asset_config where singleton;
  if v_origin is null then
    raise exception using errcode = 'P0001', message = 'quotation_payment_asset_origin_not_configured';
  end if;
  return p_url like v_origin || '/quotations/payment-assets/%'
    and substring(p_url from char_length(v_origin) + 1) ~ '^/quotations/payment-assets/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$';
end;
$_$;


ALTER FUNCTION "private"."validate_quotation_payment_asset_url"("p_url" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."quotation_company_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "bank_id" "uuid",
    "custom_bank_name" "text" DEFAULT ''::"text" NOT NULL,
    "custom_bank_logo_url" "text" DEFAULT ''::"text" NOT NULL,
    "account_number" "text" DEFAULT ''::"text" NOT NULL,
    "account_name" "text" DEFAULT ''::"text" NOT NULL,
    "promptpay_id" "text" DEFAULT ''::"text" NOT NULL,
    "provider_name" "text" DEFAULT ''::"text" NOT NULL,
    "instructions" "text" DEFAULT ''::"text" NOT NULL,
    "qr_mode" "text" DEFAULT 'none'::"text" NOT NULL,
    "qr_image_url" "text" DEFAULT ''::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_type" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "quotation_company_payment_methods_account_type_check" CHECK (("account_type" = ANY (ARRAY[''::"text", 'savings'::"text", 'current'::"text", 'fixed'::"text"]))),
    CONSTRAINT "quotation_company_payment_methods_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "quotation_company_payment_methods_qr_mode_check" CHECK (("qr_mode" = ANY (ARRAY['none'::"text", 'upload'::"text", 'auto_promptpay'::"text"]))),
    CONSTRAINT "quotation_company_payment_methods_trusted_asset_urls" CHECK (("private"."validate_quotation_payment_asset_url"("custom_bank_logo_url") AND "private"."validate_quotation_payment_asset_url"("qr_image_url"))),
    CONSTRAINT "quotation_company_payment_methods_type_check" CHECK (("type" = ANY (ARRAY['bank_transfer'::"text", 'promptpay'::"text", 'qr_payment'::"text", 'cash'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."quotation_company_payment_methods" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation_company_payment_methods"("p_methods" "jsonb") RETURNS SETOF "public"."quotation_company_payment_methods"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_method jsonb;
  v_type text;
  v_bank_id uuid;
  v_qr_mode text;
  v_position integer := 1;
begin
  if not private.has_quotation_permission() then raise exception using errcode = '42501', message = 'Unauthorized'; end if;
  if jsonb_typeof(p_methods) is distinct from 'array' or jsonb_array_length(p_methods) > 20 then
    raise exception using errcode = '22023', message = 'Payment methods must be an array of at most 20 rows';
  end if;
  if exists (select 1 from jsonb_array_elements(p_methods) rows group by value ->> 'id' having count(*) > 1) then
    raise exception using errcode = '22023', message = 'Payment method IDs must be unique';
  end if;
  for v_method in select value from jsonb_array_elements(p_methods) loop perform private.validate_quotation_payment_method(v_method); end loop;
  delete from public.quotation_company_payment_methods where user_id = auth.uid();
  for v_method in select value from jsonb_array_elements(p_methods) loop
    v_type := btrim(v_method ->> 'type');
    v_bank_id := case when v_type = 'bank_transfer' then nullif(btrim(coalesce(v_method ->> 'bank_id', '')), '')::uuid end;
    v_qr_mode := case
      when v_type = 'promptpay' then btrim(coalesce(v_method ->> 'qr_mode', 'none'))
      when v_type = 'qr_payment' then 'upload'
      when v_type = 'bank_transfer' and btrim(coalesce(v_method ->> 'qr_mode', 'none')) = 'upload' then 'upload'
      else 'none'
    end;
    insert into public.quotation_company_payment_methods (
      id, user_id, type, bank_id, custom_bank_name, custom_bank_logo_url, account_number,
      account_type, account_name, promptpay_id, provider_name, instructions, qr_mode, qr_image_url, is_default, position
    ) values (
      (btrim(v_method ->> 'id'))::uuid, auth.uid(), v_type, v_bank_id,
      case when v_type = 'bank_transfer' and v_bank_id is null then btrim(coalesce(v_method ->> 'custom_bank_name', '')) else '' end,
      case when v_type = 'bank_transfer' and v_bank_id is null then btrim(coalesce(v_method ->> 'custom_bank_logo_url', '')) else '' end,
      case when v_type = 'bank_transfer' then btrim(coalesce(v_method ->> 'account_number', '')) else '' end,
      case when v_type = 'bank_transfer' then btrim(coalesce(v_method ->> 'account_type', '')) else '' end,
      case when v_type in ('bank_transfer', 'promptpay') then btrim(coalesce(v_method ->> 'account_name', '')) else '' end,
      case when v_type = 'promptpay' then regexp_replace(coalesce(v_method ->> 'promptpay_id', ''), '\D', '', 'g') else '' end,
      case when v_type in ('qr_payment', 'other') then btrim(coalesce(v_method ->> 'provider_name', '')) else '' end,
      btrim(coalesce(v_method ->> 'instructions', '')), v_qr_mode,
      case when v_qr_mode = 'upload' then btrim(coalesce(v_method ->> 'qr_image_url', '')) else '' end,
      coalesce((v_method ->> 'is_default')::boolean, false), v_position
    );
    v_position := v_position + 1;
  end loop;
  return query select * from public.quotation_company_payment_methods where user_id = auth.uid() order by position;
end;
$$;


ALTER FUNCTION "private"."save_quotation_company_payment_methods"("p_methods" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation_with_document_display"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_display jsonb := p_payload -> 'document_display_snapshot';
  v_saved record;
begin
  if not private.is_quotation_document_display(v_display) then
    raise exception using
      errcode = '22023',
      message = 'Invalid quotation document display';
  end if;

  select *
  into v_saved
  from private.save_quotation_with_payments(p_payload);

  update public.quotations q
  set document_display_snapshot = v_display
  where q.id = v_saved.id
    and q.created_by = auth.uid()
    and q.deleted_at is null;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Quotation document display update denied';
  end if;

  return query select v_saved.id, v_saved.document_number;
end;
$$;


ALTER FUNCTION "private"."save_quotation_with_document_display"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation_with_payments"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_profile_id uuid;
  v_submitted_profile_id uuid;
  v_saved record;
  v_method jsonb;
  v_bank public.banks%rowtype;
  v_bank_id uuid;
  v_type text;
  v_qr_mode text;
  v_position integer := 1;
  v_methods jsonb := coalesce(p_payload -> 'payment_methods', '[]'::jsonb);
  v_certification jsonb;
  v_amount_due numeric;
begin
  if not private.has_quotation_permission() then raise exception using errcode = '42501', message = 'Unauthorized'; end if;
  v_certification := private.normalize_quotation_certification(
    p_payload -> 'certification_snapshot'
  );
  if jsonb_typeof(v_methods) is distinct from 'array' or jsonb_array_length(v_methods) > 20 then
    raise exception using errcode = '22023', message = 'Payment methods must be an array of at most 20 rows';
  end if;
  if exists (select 1 from jsonb_array_elements(v_methods) rows group by value ->> 'id' having count(*) > 1) then
    raise exception using errcode = '22023', message = 'Payment method IDs must be unique';
  end if;
  for v_method in select value from jsonb_array_elements(v_methods) loop perform private.validate_quotation_payment_method(v_method); end loop;
  select profile.id into v_profile_id from public.quotation_company_profiles profile where profile.user_id = auth.uid();
  if v_profile_id is null then raise exception using errcode = '23514', message = 'Seller profile not found'; end if;
  v_submitted_profile_id := nullif(p_payload ->> 'company_profile_id', '')::uuid;
  if v_submitted_profile_id is not null and v_submitted_profile_id <> v_profile_id then
    raise exception using errcode = '42501', message = 'Seller profile does not belong to current user';
  end if;
  select * into v_saved from private.save_quotation(p_payload);
  update public.quotations set company_profile_id = v_profile_id
  where quotations.id = v_saved.id and quotations.created_by = auth.uid() and quotations.deleted_at is null and quotations.company_profile_id is distinct from v_profile_id;
  update public.quotations
  set certification_snapshot = v_certification
  where quotations.id = v_saved.id
    and quotations.created_by = auth.uid()
    and quotations.deleted_at is null;
  if not found then
    raise exception using errcode = '42501', message = 'Quotation does not belong to current user';
  end if;
  select quotations.amount_due into v_amount_due from public.quotations
  where quotations.id = v_saved.id and quotations.company_profile_id = v_profile_id and quotations.created_by = auth.uid() and quotations.deleted_at is null;
  if v_amount_due is null then raise exception using errcode = '42501', message = 'Quotation seller profile does not belong to current user'; end if;
  if exists (select 1 from jsonb_array_elements(v_methods) row where btrim(row ->> 'type') = 'promptpay' and btrim(row ->> 'qr_mode') = 'auto_promptpay')
    and (v_amount_due <= 0 or v_amount_due > 9999999999.99) then
    raise exception using errcode = '22023', message = 'Automatic PromptPay amount is out of range';
  end if;
  delete from public.quotation_payment_methods where quotation_id = v_saved.id;
  for v_method in select value from jsonb_array_elements(v_methods) loop
    v_type := btrim(v_method ->> 'type');
    v_bank_id := case when v_type = 'bank_transfer' then nullif(btrim(coalesce(v_method ->> 'bank_id', '')), '')::uuid end;
    select * into v_bank from public.banks where banks.id = v_bank_id;
    v_qr_mode := case
      when v_type = 'promptpay' then btrim(coalesce(v_method ->> 'qr_mode', 'none'))
      when v_type = 'qr_payment' then 'upload'
      when v_type = 'bank_transfer' and btrim(coalesce(v_method ->> 'qr_mode', 'none')) = 'upload' then 'upload'
      else 'none'
    end;
    insert into public.quotation_payment_methods (
      id, quotation_id, type, bank_code, bank_name, bank_logo_url, custom_bank_name,
      custom_bank_logo_url, account_number, account_type, account_name, promptpay_id, provider_name,
      instructions, qr_mode, qr_image_url, position
    ) values (
      (btrim(v_method ->> 'id'))::uuid, v_saved.id, v_type,
      case when v_type = 'bank_transfer' then coalesce(v_bank.code, 'OTHER') else '' end,
      case when v_type = 'bank_transfer' then coalesce(v_bank.name, btrim(coalesce(v_method ->> 'custom_bank_name', ''))) else '' end,
      case when v_type = 'bank_transfer' then coalesce(v_bank.logo_path, case when btrim(coalesce(v_method ->> 'bank_logo_url', '')) ~* '^/quotation/banks/[a-z0-9-]+\.svg$' then btrim(v_method ->> 'bank_logo_url') else '' end) else '' end,
      case when v_type = 'bank_transfer' and v_bank_id is null then btrim(coalesce(v_method ->> 'custom_bank_name', '')) else '' end,
      case when v_type = 'bank_transfer' and v_bank_id is null then btrim(coalesce(v_method ->> 'custom_bank_logo_url', '')) else '' end,
      case when v_type = 'bank_transfer' then btrim(coalesce(v_method ->> 'account_number', '')) else '' end,
      case when v_type = 'bank_transfer' then btrim(coalesce(v_method ->> 'account_type', '')) else '' end,
      case when v_type in ('bank_transfer', 'promptpay') then btrim(coalesce(v_method ->> 'account_name', '')) else '' end,
      case when v_type = 'promptpay' then regexp_replace(coalesce(v_method ->> 'promptpay_id', ''), '\D', '', 'g') else '' end,
      case when v_type in ('qr_payment', 'other') then btrim(coalesce(v_method ->> 'provider_name', '')) else '' end,
      btrim(coalesce(v_method ->> 'instructions', '')), v_qr_mode,
      case when v_qr_mode = 'upload' then btrim(coalesce(v_method ->> 'qr_image_url', '')) else '' end,
      v_position
    );
    v_position := v_position + 1;
  end loop;
  return query select v_saved.id, v_saved.document_number;
end;
$_$;


ALTER FUNCTION "private"."save_quotation_with_payments"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_quotation_with_template"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_template text := btrim(coalesce(p_payload ->> 'document_template_snapshot', ''));
  v_source_id uuid := nullif(p_payload ->> 'document_template_source_id', '')::uuid;
  v_revision_number bigint := nullif(p_payload ->> 'document_template_revision_snapshot', '')::bigint;
  v_schema_version integer := nullif(p_payload ->> 'document_layout_schema_version_snapshot', '')::integer;
  v_layout jsonb := p_payload -> 'document_layout_snapshot';
  v_saved record;
begin
  if not private.is_quotation_template(v_template)
    or v_source_id is null
    or v_revision_number is null
    or v_schema_version <> 2
    or not private.is_quotation_layout(v_layout, v_template) then
    raise exception using errcode = '22023', message = 'Invalid quotation document layout snapshot';
  end if;

  perform 1
  from public.quotation_document_templates template
  join public.quotation_document_template_revisions revision
    on revision.template_id = template.id and revision.revision_number = v_revision_number
  where template.id = v_source_id
    and template.user_id = auth.uid()
    and template.template_key = v_template
    and revision.layout_schema_version = v_schema_version
    and revision.layout_config = v_layout;
  if not found then
    raise exception using errcode = '42501', message = 'Quotation document layout snapshot denied';
  end if;

  select * into v_saved from private.save_quotation_with_document_display(p_payload);
  update public.quotations quotation
  set document_template_snapshot = v_template,
      document_template_source_id = v_source_id,
      document_template_revision_snapshot = v_revision_number,
      document_layout_schema_version_snapshot = v_schema_version,
      document_layout_snapshot = v_layout
  where quotation.id = v_saved.id
    and quotation.created_by = auth.uid()
    and quotation.deleted_at is null;
  if not found then
    raise exception using errcode = '42501', message = 'Quotation document layout update denied';
  end if;

  return query select v_saved.id, v_saved.document_number;
end;
$$;


ALTER FUNCTION "private"."save_quotation_with_template"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."soft_delete_quotation"("p_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare v_deleted_id uuid;
begin
  if not private.has_quotation_permission() then raise exception using errcode = '42501', message = 'Unauthorized'; end if;
  update public.quotations
  set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
  where id = p_id and created_by = auth.uid() and deleted_at is null
  returning id into v_deleted_id;
  if v_deleted_id is null then raise exception using errcode = 'P0002', message = 'Quotation not found'; end if;
  return v_deleted_id;
end;
$$;


ALTER FUNCTION "private"."soft_delete_quotation"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_quotation_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by, old.updated_by);
  return new;
end;
$$;


ALTER FUNCTION "private"."touch_quotation_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_quotation_certification_asset_url"("p_url" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_origin text;
  v_path text;
begin
  if coalesce(btrim(p_url), '') = '' then return true; end if;
  select origin into v_origin from private.quotation_payment_asset_config where singleton;
  if v_origin is null or left(p_url, char_length(v_origin) + 1) <> (v_origin || '/') then return false; end if;
  v_path := substring(p_url from char_length(v_origin) + 1);
  return v_path ~* '^/quotations/certification-assets/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$';
end;
$_$;


ALTER FUNCTION "private"."validate_quotation_certification_asset_url"("p_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_quotation_payment_method"("p_method" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_type text := btrim(coalesce(p_method ->> 'type', ''));
  v_account_type text := btrim(coalesce(p_method ->> 'account_type', ''));
  v_qr_mode text := btrim(coalesce(p_method ->> 'qr_mode', 'none'));
  v_bank_id_text text := btrim(coalesce(p_method ->> 'bank_id', ''));
  v_bank_id uuid;
  v_promptpay_id text := regexp_replace(coalesce(p_method ->> 'promptpay_id', ''), '\D', '', 'g');
  v_bank_logo_url text := btrim(coalesce(p_method ->> 'bank_logo_url', ''));
begin
  if jsonb_typeof(p_method) is distinct from 'object'
    or btrim(coalesce(p_method ->> 'id', '')) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_type not in ('bank_transfer', 'promptpay', 'qr_payment', 'cash', 'other')
    or v_account_type not in ('', 'savings', 'current', 'fixed')
    or v_qr_mode not in ('none', 'upload', 'auto_promptpay')
    or char_length(btrim(coalesce(p_method ->> 'instructions', ''))) > 2000 then
    raise exception using errcode = '22023', message = 'Invalid payment method';
  end if;

  if v_bank_id_text <> '' then
    if v_bank_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'Invalid payment method';
    end if;
    v_bank_id := v_bank_id_text::uuid;
  end if;

  if v_type = 'bank_transfer' then
    if char_length(btrim(coalesce(p_method ->> 'account_name', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'account_number', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'bank_code', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'bank_name', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'bank_logo_url', ''))) > 2048
      or char_length(btrim(coalesce(p_method ->> 'custom_bank_name', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'custom_bank_logo_url', ''))) > 2048
      or btrim(coalesce(p_method ->> 'account_name', '')) = ''
      or btrim(coalesce(p_method ->> 'account_number', '')) = ''
      or (v_bank_id is null and btrim(coalesce(p_method ->> 'custom_bank_name', '')) = '')
      or (v_bank_id is not null and not exists (select 1 from public.banks where id = v_bank_id))
      or (v_bank_logo_url <> '' and v_bank_logo_url !~* '^/quotation/banks/[a-z0-9-]+\.svg$')
      or (v_bank_id is null and not private.validate_quotation_payment_asset_url(btrim(coalesce(p_method ->> 'custom_bank_logo_url', ''))))
      or (v_qr_mode = 'upload' and (
        btrim(coalesce(p_method ->> 'qr_image_url', '')) = ''
        or char_length(btrim(coalesce(p_method ->> 'qr_image_url', ''))) > 2048
        or not private.validate_quotation_payment_asset_url(btrim(coalesce(p_method ->> 'qr_image_url', '')))
      )) then
      raise exception using errcode = '22023', message = 'Invalid payment method';
    end if;
  elsif v_type = 'promptpay' then
    if char_length(btrim(coalesce(p_method ->> 'account_name', ''))) > 200
      or char_length(btrim(coalesce(p_method ->> 'promptpay_id', ''))) > 200
      or btrim(coalesce(p_method ->> 'account_name', '')) = ''
      or length(v_promptpay_id) not in (10, 13)
      or v_qr_mode not in ('upload', 'auto_promptpay')
      or (v_qr_mode = 'upload' and (
        btrim(coalesce(p_method ->> 'qr_image_url', '')) = ''
        or char_length(btrim(coalesce(p_method ->> 'qr_image_url', ''))) > 2048
        or not private.validate_quotation_payment_asset_url(btrim(coalesce(p_method ->> 'qr_image_url', '')))
      )) then
      raise exception using errcode = '22023', message = 'Invalid payment method';
    end if;
  elsif v_type = 'qr_payment' then
    if char_length(btrim(coalesce(p_method ->> 'provider_name', ''))) > 200
      or btrim(coalesce(p_method ->> 'provider_name', '')) = ''
      or btrim(coalesce(p_method ->> 'qr_image_url', '')) = ''
      or char_length(btrim(coalesce(p_method ->> 'qr_image_url', ''))) > 2048
      or not private.validate_quotation_payment_asset_url(btrim(coalesce(p_method ->> 'qr_image_url', ''))) then
      raise exception using errcode = '22023', message = 'Invalid payment method';
    end if;
  elsif v_type = 'other' and (
    char_length(btrim(coalesce(p_method ->> 'provider_name', ''))) > 200
    or btrim(coalesce(p_method ->> 'provider_name', '')) = ''
  ) then
    raise exception using errcode = '22023', message = 'Invalid payment method';
  end if;
end;
$_$;


ALTER FUNCTION "private"."validate_quotation_payment_method"("p_method" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."configure_quotation_payment_asset_origin"("p_origin" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'private'
    AS $_$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;
  if p_origin is null then
    delete from private.quotation_payment_asset_config where singleton;
    return;
  end if;
  if btrim(p_origin) !~ '^https://[a-z0-9][a-z0-9.-]*(?::[0-9]+)?$' then
    raise exception using errcode = '22023', message = 'Invalid media Worker origin';
  end if;
  insert into private.quotation_payment_asset_config (singleton, origin)
  values (true, btrim(p_origin))
  on conflict (singleton) do update set origin = excluded.origin;
end;
$_$;


ALTER FUNCTION "public"."configure_quotation_payment_asset_origin"("p_origin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_quotation"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select private.get_public_quotation(p_token);
$$;


ALTER FUNCTION "public"."get_public_quotation"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_villa_zones"() RETURNS TABLE("location_zone" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select distinct trim(l.location_zone) as location_zone
  from public.listings l
  where l.is_active is true
    and nullif(trim(l.location_zone), '') is not null
  order by location_zone;
$$;


ALTER FUNCTION "public"."get_public_villa_zones"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_quotation_customers"("p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20, "p_search" "text" DEFAULT ''::"text", "p_active" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "customer_type" "text", "tax_id" "text", "name" "text", "address" "text", "office_type" "text", "branch_number" "text", "contact_name" "text", "contact_phone" "text", "contact_email" "text", "dbd_name" "text", "dbd_address" "text", "dbd_status" "text", "dbd_verified_at" timestamp with time zone, "is_active" boolean, "updated_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select
    c.id, c.customer_type, c.tax_id, c.name, c.address, c.office_type,
    c.branch_number, c.contact_name, c.contact_phone, c.contact_email,
    c.dbd_name, c.dbd_address, c.dbd_status, c.dbd_verified_at,
    c.is_active, c.updated_at, count(*) over ()
  from public.quotation_customers c
  where c.owner_id = auth.uid()
    and c.is_active = p_active
    and (
      nullif(btrim(p_search), '') is null
      or c.name ilike '%' || btrim(p_search) || '%'
      or c.tax_id ilike '%' || btrim(p_search) || '%'
      or c.contact_name ilike '%' || btrim(p_search) || '%'
      or c.contact_phone ilike '%' || btrim(p_search) || '%'
      or c.contact_email ilike '%' || btrim(p_search) || '%'
    )
  order by c.updated_at desc, c.id desc
  limit least(greatest(p_page_size, 1), 100)
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100);
$$;


ALTER FUNCTION "public"."list_quotation_customers"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_quotations"("p_search" "text" DEFAULT ''::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "document_number" "text", "issue_date" "date", "valid_until" "date", "customer_name" "text", "grand_total" numeric, "updated_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select q.id, q.document_number, q.issue_date, q.valid_until, coalesce(q.customer_snapshot ->> 'name', ''), q.grand_total, q.updated_at, count(*) over ()
  from public.quotations q
  where q.deleted_at is null
    and q.created_by = auth.uid()
    and (nullif(trim(p_search), '') is null or q.document_number ilike '%' || trim(p_search) || '%' or q.reference ilike '%' || trim(p_search) || '%' or q.subject ilike '%' || trim(p_search) || '%' or coalesce(q.customer_snapshot ->> 'name', '') ilike '%' || trim(p_search) || '%')
  order by q.updated_at desc, q.id desc
  limit least(greatest(p_page_size, 1), 100)
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100);
$$;


ALTER FUNCTION "public"."list_quotations"("p_search" "text", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_quotation_document_template_layout"("p_template_key" "text", "p_expected_revision_number" bigint, "p_layout_config" "jsonb") RETURNS TABLE("template_id" "uuid", "revision_number" bigint, "layout_config" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_template record;
  v_revision_number bigint;
begin
  if not private.has_quotation_permission()
    or auth.uid() is null
    or p_template_key not in ('current', 'hospitality', 'corporate') then
    raise exception using errcode = '42501', message = 'Quotation layout publication denied';
  end if;
  if not private.is_quotation_layout(p_layout_config, p_template_key) then
    raise exception using errcode = '22023', message = 'Invalid quotation layout';
  end if;

  select id, current_revision_number into v_template
  from public.quotation_document_templates
  where user_id = auth.uid() and template_key = p_template_key
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Quotation layout template not found';
  end if;
  if p_expected_revision_number <> v_template.current_revision_number then
    raise exception using errcode = '40001', message = 'Quotation layout revision conflict';
  end if;

  v_revision_number := v_template.current_revision_number + 1;
  insert into public.quotation_document_template_revisions (
    template_id, revision_number, layout_schema_version, layout_config, created_by
  ) values (v_template.id, v_revision_number, 2, p_layout_config, auth.uid());
  update public.quotation_document_templates
  set current_revision_number = v_revision_number, updated_at = now()
  where id = v_template.id;
  return query select v_template.id, v_revision_number, p_layout_config;
end;
$$;


ALTER FUNCTION "public"."publish_quotation_document_template_layout"("p_template_key" "text", "p_expected_revision_number" bigint, "p_layout_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_quotation_public_token"("p_id" "uuid") RETURNS TABLE("public_token" "uuid", "public_token_expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  if auth.uid() is null or not private.has_quotation_permission() then
    raise exception using errcode = '42501', message = 'Quotation public link rotation denied';
  end if;
  return query
  update public.quotations q
  set public_token = gen_random_uuid(),
      public_token_expires_at = now() + interval '30 days',
      public_token_revoked_at = null
  where q.id = p_id and q.created_by = auth.uid() and q.deleted_at is null
  returning q.public_token, q.public_token_expires_at;
  if not found then
    raise exception using errcode = '42501', message = 'Quotation public link rotation denied';
  end if;
end;
$$;


ALTER FUNCTION "public"."rotate_quotation_public_token"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_quotation"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select *
  from private.save_quotation_with_template(p_payload);
$$;


ALTER FUNCTION "public"."save_quotation"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_quotation_company_certification"("p_value" "jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select private.save_quotation_company_certification(p_value);
$$;


ALTER FUNCTION "public"."save_quotation_company_certification"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_quotation_company_payment_methods"("p_methods" "jsonb") RETURNS SETOF "public"."quotation_company_payment_methods"
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ select * from private.save_quotation_company_payment_methods(p_methods); $$;


ALTER FUNCTION "public"."save_quotation_company_payment_methods"("p_methods" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_quotation_with_payments"("p_payload" "jsonb") RETURNS TABLE("id" "uuid", "document_number" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select *
  from private.save_quotation_with_template(p_payload);
$$;


ALTER FUNCTION "public"."save_quotation_with_payments"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_quotation"("p_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ select private.soft_delete_quotation(p_id); $$;


ALTER FUNCTION "public"."soft_delete_quotation"("p_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."quotation_number_counters" (
    "issue_date" "date" NOT NULL,
    "last_value" integer NOT NULL,
    CONSTRAINT "quotation_number_counters_last_value_check" CHECK (("last_value" > 0))
);


ALTER TABLE "private"."quotation_number_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."quotation_payment_asset_config" (
    "singleton" boolean DEFAULT true NOT NULL,
    "origin" "text" NOT NULL,
    CONSTRAINT "quotation_payment_asset_config_origin_check" CHECK (("origin" ~ '^https://[a-z0-9][a-z0-9.-]*(?::[0-9]+)?$'::"text")),
    CONSTRAINT "quotation_payment_asset_config_singleton_check" CHECK ("singleton")
);


ALTER TABLE "private"."quotation_payment_asset_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "image_name" "text" NOT NULL,
    "image_order" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_path" "text" GENERATED ALWAYS AS (
CASE
    WHEN ("image_name" ~~ 'advertisements/%'::"text") THEN "image_name"
    ELSE ((('advertisements/'::"text" || ("advertisement_id")::"text") || '/'::"text") || "image_name")
END) STORED,
    CONSTRAINT "advertisement_images_order_range" CHECK ((("image_order" >= 1) AND ("image_order" <= 2)))
);


ALTER TABLE "public"."advertisement_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "zone" "text" NOT NULL,
    CONSTRAINT "advertisements_zone_check" CHECK (("zone" = ANY (ARRAY['all'::"text", 'bangkok'::"text", 'bangsaray'::"text", 'bang_saray'::"text", 'bangsean'::"text", 'bang_saen'::"text", 'hua_hin'::"text", 'huahin'::"text", 'jomtien'::"text", 'khaoyai'::"text", 'pattaya'::"text", 'rayong'::"text", 'sattahip'::"text"])))
);


ALTER TABLE "public"."advertisements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "bank_id" "uuid" NOT NULL,
    "account_number" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_accounts_account_number_check" CHECK ((("char_length"("account_number") >= 1) AND ("char_length"("account_number") <= 30)))
);


ALTER TABLE "public"."agent_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agents_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "agents_video_url_check" CHECK (("video_url" ~ '^https://'::"text"))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "code" "text",
    "logo_path" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "banks_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "banks_sort_order_check" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."banks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bedroom" (
    "id" bigint NOT NULL,
    "house_id" "uuid",
    "name" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."bedroom" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bedroom_facility" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "bedroom_id" bigint,
    "facility_id" bigint
);


ALTER TABLE "public"."bedroom_facility" OWNER TO "postgres";


ALTER TABLE "public"."bedroom_facility" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bedroom_facility_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."bedroom" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bedroom_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."bedroom_image" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "url" character varying DEFAULT 'NULL'::character varying,
    "description" "text" DEFAULT 'NULL'::"text",
    "bedroom_id" bigint,
    "facility_id" bigint
);


ALTER TABLE "public"."bedroom_image" OWNER TO "postgres";


ALTER TABLE "public"."bedroom_image" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bedroom_image_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."booking_logs" (
    "id" bigint NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_status" "text",
    "new_status" "text",
    "changed_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deville_id" bigint
);


ALTER TABLE "public"."booking_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."booking_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."booking_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."booking_logs_id_seq" OWNED BY "public"."booking_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listings_id" "uuid",
    "guest_id" "uuid",
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "during" "daterange" GENERATED ALWAYS AS ("daterange"("check_in", "check_out", '[)'::"text")) STORED,
    "agent_id" bigint,
    "house_id" bigint,
    "details" "text",
    "codebooking" character varying
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."central_user_audit_events" (
    "operation_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_uid" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "status" "text" NOT NULL,
    "safe_error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "central_user_audit_events_action_check" CHECK (("action" = ANY (ARRAY['list_users'::"text", 'create_user'::"text", 'reissue_temporary_password'::"text", 'suspend_user'::"text", 'reactivate_user'::"text"]))),
    CONSTRAINT "central_user_audit_events_safe_error_code_check" CHECK ((("safe_error_code" IS NULL) OR ("char_length"("safe_error_code") <= 64))),
    CONSTRAINT "central_user_audit_events_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'in_progress'::"text", 'needs_review'::"text", 'quarantined'::"text", 'failed'::"text"]))),
    CONSTRAINT "central_user_audit_terminal_error" CHECK (((("status" = 'failed'::"text") AND ("safe_error_code" IS NOT NULL)) OR (("status" <> 'failed'::"text") AND ("safe_error_code" IS NULL)))),
    CONSTRAINT "central_user_audit_terminal_state" CHECK (((("status" = ANY (ARRAY['completed'::"text", 'needs_review'::"text", 'quarantined'::"text", 'failed'::"text"])) AND ("completed_at" IS NOT NULL)) OR (("status" = ANY (ARRAY['started'::"text", 'in_progress'::"text"])) AND ("completed_at" IS NULL))))
);

ALTER TABLE ONLY "public"."central_user_audit_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."central_user_audit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificate_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "certificate_logs_action_check" CHECK ((("char_length"("action") >= 1) AND ("char_length"("action") <= 50))),
    CONSTRAINT "certificate_logs_target_type_check" CHECK ((("char_length"("target_type") >= 1) AND ("char_length"("target_type") <= 30)))
);


ALTER TABLE "public"."certificate_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificate_main_video" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description_align" "text" DEFAULT 'center'::"text" NOT NULL,
    CONSTRAINT "certificate_main_video_description_align_check" CHECK (("description_align" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "certificate_main_video_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 2000))),
    CONSTRAINT "certificate_main_video_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200))),
    CONSTRAINT "certificate_main_video_video_url_check" CHECK (("video_url" ~ '^https://'::"text"))
);


ALTER TABLE "public"."certificate_main_video" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."house" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "h_id" bigint,
    "h_bedroom" integer,
    "h_toilet" integer,
    "h_extra" integer,
    "h_insurance" bigint,
    "h_location" "jsonb",
    "h_position" character varying DEFAULT 'NULL'::character varying,
    "h_zone" "jsonb",
    "h_village" "jsonb",
    "h_status" character varying DEFAULT 'offline'::character varying,
    "h_time_checkin" time with time zone,
    "h_time_checkout" time with time zone,
    "h_note" "text" DEFAULT 'NULL'::"text",
    "h_type" character varying DEFAULT 'NULL'::character varying,
    "h_owner" bigint,
    "line_group_id" "text" DEFAULT 'NULL'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "h_name" character varying DEFAULT 'NULL'::character varying
);


ALTER TABLE "public"."house" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."images" (
    "id" bigint NOT NULL,
    "property_id" bigint NOT NULL,
    "cover_select" smallint DEFAULT 0,
    "image_name" character varying(255) NOT NULL,
    "image_url" character varying(255) NOT NULL,
    "caption" character varying(255) DEFAULT NULL::character varying,
    "create_by" bigint NOT NULL,
    "image_zone" character varying(30) NOT NULL,
    "image_move" bigint NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "images_create_by_check" CHECK (("create_by" > 0)),
    CONSTRAINT "images_id_check" CHECK (("id" > 0)),
    CONSTRAINT "images_image_move_check" CHECK (("image_move" > 0)),
    CONSTRAINT "images_image_zone_check" CHECK ((("image_zone")::"text" = ANY ((ARRAY['cover'::character varying, 'bedroom'::character varying, 'bathroom'::character varying, 'outside'::character varying, 'inside'::character varying, 'kitchen'::character varying, 'parking'::character varying, 'review'::character varying])::"text"[]))),
    CONSTRAINT "images_property_id_check" CHECK (("property_id" > 0))
);


ALTER TABLE "public"."images" OWNER TO "postgres";


ALTER TABLE "public"."images" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."line_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" bigint,
    "token_line" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."line_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" DEFAULT "gen_random_uuid"(),
    "facility_id" "uuid" DEFAULT "gen_random_uuid"(),
    "message" "text",
    "value_boolean" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."listing_facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" DEFAULT "gen_random_uuid"(),
    "day_of_week" smallint,
    "base_guests" integer,
    "deville_price" bigint,
    "agency_price" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "notes" "text"
);


ALTER TABLE "public"."listing_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" bigint,
    "title" character varying,
    "description" "text",
    "bedrooms" integer,
    "bathrooms" integer,
    "extra_beds" integer,
    "insurance_fee" bigint,
    "owner_id" bigint,
    "checkin_time" time without time zone,
    "checkout_time" time without time zone,
    "sort_order" integer,
    "notes" "text",
    "location_zone" character varying,
    "property_type" character varying,
    "rating" smallint,
    "max_guests" integer DEFAULT 0 NOT NULL,
    "is_active" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "property_tags" "jsonb"
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" bigint NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "is_host" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE "public"."profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quotation_company_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_name" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "tax_id" "text" DEFAULT ''::"text" NOT NULL,
    "office_type" "text" DEFAULT 'head_office'::"text" NOT NULL,
    "branch_number" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "website" "text" DEFAULT ''::"text" NOT NULL,
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "contact_phone" "text" DEFAULT ''::"text" NOT NULL,
    "contact_email" "text" DEFAULT ''::"text" NOT NULL,
    "logo_url" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "issuer_name" "text",
    "issuer_position" "text",
    "issuer_signature_url" "text",
    "approver_name" "text",
    "approver_position" "text",
    "approver_signature_url" "text",
    "company_stamp_url" "text",
    "document_display_defaults" "jsonb" DEFAULT '{"tax": true, "unit": true, "notes": true, "preTax": true, "discount": true, "reference": true, "withholdingTax": true, "certificationQr": true, "certificationDate": true, "certificationName": true}'::"jsonb" NOT NULL,
    "document_template_default" "text" DEFAULT 'current'::"text" NOT NULL,
    CONSTRAINT "quotation_company_profiles_document_display_defaults_valid" CHECK ("private"."is_quotation_document_display"("document_display_defaults")),
    CONSTRAINT "quotation_company_profiles_document_template_default_valid" CHECK (("document_template_default" = ANY (ARRAY['current'::"text", 'hospitality'::"text", 'corporate'::"text"])))
);


ALTER TABLE "public"."quotation_company_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_type" "text" NOT NULL,
    "tax_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "office_type" "text" DEFAULT 'unspecified'::"text" NOT NULL,
    "branch_number" "text" DEFAULT ''::"text" NOT NULL,
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "contact_phone" "text" DEFAULT ''::"text" NOT NULL,
    "contact_email" "text" DEFAULT ''::"text" NOT NULL,
    "dbd_name" "text",
    "dbd_address" "text",
    "dbd_status" "text",
    "dbd_verified_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    CONSTRAINT "quotation_customers_address_check" CHECK ((("char_length"("btrim"("address")) >= 1) AND ("char_length"("btrim"("address")) <= 2000))),
    CONSTRAINT "quotation_customers_branch_number_canonical" CHECK (((("office_type" = 'branch'::"text") AND ("branch_number" = "btrim"("branch_number")) AND ("branch_number" <> ''::"text")) OR (("office_type" <> 'branch'::"text") AND ("branch_number" = ''::"text")))),
    CONSTRAINT "quotation_customers_check" CHECK ((("char_length"("branch_number") <= 200) AND (("office_type" <> 'branch'::"text") OR ("btrim"("branch_number") <> ''::"text")))),
    CONSTRAINT "quotation_customers_contact_email_check" CHECK ((("char_length"("contact_email") <= 200) AND (("contact_email" = ''::"text") OR ("contact_email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text")))),
    CONSTRAINT "quotation_customers_contact_name_check" CHECK (("char_length"("contact_name") <= 200)),
    CONSTRAINT "quotation_customers_contact_phone_check" CHECK (("char_length"("contact_phone") <= 200)),
    CONSTRAINT "quotation_customers_customer_type_check" CHECK (("customer_type" = ANY (ARRAY['juristic'::"text", 'individual'::"text"]))),
    CONSTRAINT "quotation_customers_dbd_address_check" CHECK ((("dbd_address" IS NULL) OR (("char_length"("btrim"("dbd_address")) >= 1) AND ("char_length"("btrim"("dbd_address")) <= 2000)))),
    CONSTRAINT "quotation_customers_dbd_complete" CHECK (((("dbd_name" IS NULL) AND ("dbd_address" IS NULL) AND ("dbd_status" IS NULL) AND ("dbd_verified_at" IS NULL)) OR (("customer_type" = 'juristic'::"text") AND ("dbd_name" IS NOT NULL) AND ("dbd_address" IS NOT NULL) AND ("dbd_status" IS NOT NULL) AND ("dbd_verified_at" IS NOT NULL)))),
    CONSTRAINT "quotation_customers_dbd_name_check" CHECK ((("dbd_name" IS NULL) OR (("char_length"("btrim"("dbd_name")) >= 1) AND ("char_length"("btrim"("dbd_name")) <= 200)))),
    CONSTRAINT "quotation_customers_dbd_status_check" CHECK ((("dbd_status" IS NULL) OR (("char_length"("btrim"("dbd_status")) >= 1) AND ("char_length"("btrim"("dbd_status")) <= 200)))),
    CONSTRAINT "quotation_customers_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 200))),
    CONSTRAINT "quotation_customers_office_type_check" CHECK (("office_type" = ANY (ARRAY['head_office'::"text", 'branch'::"text", 'unspecified'::"text"]))),
    CONSTRAINT "quotation_customers_tax_id_check" CHECK (("tax_id" ~ '^[0-9]{13}$'::"text"))
);


ALTER TABLE "public"."quotation_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_document_template_revisions" (
    "template_id" "uuid" NOT NULL,
    "revision_number" bigint NOT NULL,
    "layout_schema_version" integer NOT NULL,
    "layout_config" "jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quotation_document_template_revisio_layout_schema_version_check" CHECK (("layout_schema_version" > 0)),
    CONSTRAINT "quotation_document_template_revisions_revision_number_check" CHECK (("revision_number" > 0))
);


ALTER TABLE "public"."quotation_document_template_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_document_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_key" "text" NOT NULL,
    "current_revision_number" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quotation_document_templates_current_revision_number_check" CHECK (("current_revision_number" > 0)),
    CONSTRAINT "quotation_document_templates_template_key_check" CHECK (("template_key" = ANY (ARRAY['current'::"text", 'hospitality'::"text", 'corporate'::"text"])))
);


ALTER TABLE "public"."quotation_document_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_item_catalog" (
    "name" "text" NOT NULL,
    "sort_order" smallint NOT NULL,
    CONSTRAINT "quotation_item_catalog_sort_order_check" CHECK (("sort_order" > 0))
);


ALTER TABLE "public"."quotation_item_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit" "text",
    "unit_price" numeric(14,2) NOT NULL,
    "discount_amount" numeric(14,2) NOT NULL,
    "vat_treatment" "text" NOT NULL,
    "vat_rate" numeric(5,2) NOT NULL,
    CONSTRAINT "quotation_items_discount_amount_valid" CHECK ((("discount_amount" >= (0)::numeric) AND ("discount_amount" <= "round"(("quantity" * "unit_price"), 2)))),
    CONSTRAINT "quotation_items_position_check" CHECK (("position" > 0)),
    CONSTRAINT "quotation_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "quotation_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "bank_code" "text" DEFAULT ''::"text" NOT NULL,
    "bank_name" "text" DEFAULT ''::"text" NOT NULL,
    "bank_logo_url" "text" DEFAULT ''::"text" NOT NULL,
    "custom_bank_name" "text" DEFAULT ''::"text" NOT NULL,
    "custom_bank_logo_url" "text" DEFAULT ''::"text" NOT NULL,
    "account_number" "text" DEFAULT ''::"text" NOT NULL,
    "account_name" "text" DEFAULT ''::"text" NOT NULL,
    "promptpay_id" "text" DEFAULT ''::"text" NOT NULL,
    "provider_name" "text" DEFAULT ''::"text" NOT NULL,
    "instructions" "text" DEFAULT ''::"text" NOT NULL,
    "qr_mode" "text" DEFAULT 'none'::"text" NOT NULL,
    "qr_image_url" "text" DEFAULT ''::"text" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_type" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "quotation_payment_methods_account_type_check" CHECK (("account_type" = ANY (ARRAY[''::"text", 'savings'::"text", 'current'::"text", 'fixed'::"text"]))),
    CONSTRAINT "quotation_payment_methods_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "quotation_payment_methods_qr_mode_check" CHECK (("qr_mode" = ANY (ARRAY['none'::"text", 'upload'::"text", 'auto_promptpay'::"text"]))),
    CONSTRAINT "quotation_payment_methods_trusted_asset_urls" CHECK (("private"."validate_quotation_payment_asset_url"("custom_bank_logo_url") AND "private"."validate_quotation_payment_asset_url"("qr_image_url"))),
    CONSTRAINT "quotation_payment_methods_type_check" CHECK (("type" = ANY (ARRAY['bank_transfer'::"text", 'promptpay'::"text", 'qr_payment'::"text", 'cash'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."quotation_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_number" "text" NOT NULL,
    "issue_date" "date" NOT NULL,
    "valid_until" "date" NOT NULL,
    "validity_days" integer,
    "reference" "text" DEFAULT ''::"text" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "seller_snapshot" "jsonb" NOT NULL,
    "customer_snapshot" "jsonb" NOT NULL,
    "gross_total" numeric(14,2) NOT NULL,
    "discount_total" numeric(14,2) NOT NULL,
    "pre_tax_total" numeric(14,2) NOT NULL,
    "vat_total" numeric(14,2) NOT NULL,
    "grand_total" numeric(14,2) NOT NULL,
    "public_notes" "text" DEFAULT ''::"text" NOT NULL,
    "internal_notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "public_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "withholding_tax_rate" numeric(5,2),
    "withholding_tax_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "amount_due" numeric(14,2) DEFAULT 0 NOT NULL,
    "company_profile_id" "uuid" DEFAULT "private"."current_quotation_company_profile_id"() NOT NULL,
    "certification_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "document_display_snapshot" "jsonb" DEFAULT '{"tax": true, "unit": true, "notes": true, "preTax": true, "discount": true, "reference": true, "withholdingTax": true, "certificationQr": true, "certificationDate": true, "certificationName": true}'::"jsonb" NOT NULL,
    "document_template_snapshot" "text" DEFAULT 'current'::"text" NOT NULL,
    "document_template_source_id" "uuid",
    "document_template_revision_snapshot" bigint,
    "document_layout_schema_version_snapshot" integer,
    "document_layout_snapshot" "jsonb",
    "public_token_expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval),
    "public_token_revoked_at" timestamp with time zone,
    CONSTRAINT "quotations_amount_due_valid" CHECK ((("amount_due" = ("grand_total" - "withholding_tax_total")) AND ("amount_due" >= (0)::numeric))),
    CONSTRAINT "quotations_certification_snapshot_object_check" CHECK (("jsonb_typeof"("certification_snapshot") = 'object'::"text")),
    CONSTRAINT "quotations_discount_total_valid" CHECK ((("discount_total" >= (0)::numeric) AND ("discount_total" <= "gross_total"))),
    CONSTRAINT "quotations_document_display_snapshot_valid" CHECK ("private"."is_quotation_document_display"("document_display_snapshot")),
    CONSTRAINT "quotations_document_layout_schema_version_snapshot_valid" CHECK (("document_layout_schema_version_snapshot" > 0)),
    CONSTRAINT "quotations_document_layout_snapshot_valid" CHECK ("private"."is_quotation_layout"("document_layout_snapshot", "document_template_snapshot")),
    CONSTRAINT "quotations_document_template_revision_snapshot_valid" CHECK (("document_template_revision_snapshot" > 0)),
    CONSTRAINT "quotations_document_template_snapshot_valid" CHECK (("document_template_snapshot" = ANY (ARRAY['current'::"text", 'hospitality'::"text", 'corporate'::"text"]))),
    CONSTRAINT "quotations_grand_total_valid" CHECK (("grand_total" = ("pre_tax_total" + "vat_total"))),
    CONSTRAINT "quotations_gross_total_nonnegative" CHECK (("gross_total" >= (0)::numeric)),
    CONSTRAINT "quotations_pre_tax_total_valid" CHECK (("pre_tax_total" = ("gross_total" - "discount_total"))),
    CONSTRAINT "quotations_valid_dates" CHECK (("valid_until" >= "issue_date")),
    CONSTRAINT "quotations_validity_days_check" CHECK ((("validity_days" IS NULL) OR (("validity_days" >= 0) AND ("validity_days" <= 36500)))),
    CONSTRAINT "quotations_vat_total_nonnegative" CHECK (("vat_total" >= (0)::numeric)),
    CONSTRAINT "quotations_withholding_tax_rate_check" CHECK ((("withholding_tax_rate" IS NULL) OR (("withholding_tax_rate" >= (0)::numeric) AND ("withholding_tax_rate" <= (100)::numeric)))),
    CONSTRAINT "quotations_withholding_total_nonnegative" CHECK (("withholding_tax_total" >= (0)::numeric))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" smallint NOT NULL,
    "name" json,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


ALTER TABLE "public"."roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" character varying DEFAULT 'NULL'::character varying,
    "password" "text" DEFAULT ''::"text",
    "name" character varying,
    "tel" character varying,
    "email" character varying,
    "role_id" smallint DEFAULT '3'::smallint,
    "team_id" smallint,
    "allow_tools" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "dv_id" bigint,
    "uid" "uuid" DEFAULT "auth"."uid"(),
    "mid" bigint
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."booking_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."booking_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "private"."quotation_number_counters"
    ADD CONSTRAINT "quotation_number_counters_pkey" PRIMARY KEY ("issue_date");



ALTER TABLE ONLY "private"."quotation_payment_asset_config"
    ADD CONSTRAINT "quotation_payment_asset_config_pkey" PRIMARY KEY ("singleton");



ALTER TABLE ONLY "public"."advertisement_images"
    ADD CONSTRAINT "advertisement_images_order_unique" UNIQUE ("advertisement_id", "image_order");



ALTER TABLE ONLY "public"."advertisement_images"
    ADD CONSTRAINT "advertisement_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_accounts"
    ADD CONSTRAINT "agent_accounts_agent_id_bank_id_account_number_key" UNIQUE ("agent_id", "bank_id", "account_number");



ALTER TABLE ONLY "public"."agent_accounts"
    ADD CONSTRAINT "agent_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bedroom_facility"
    ADD CONSTRAINT "bedroom_facility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bedroom_image"
    ADD CONSTRAINT "bedroom_image_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bedroom"
    ADD CONSTRAINT "bedroom_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_logs"
    ADD CONSTRAINT "booking_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."central_user_audit_events"
    ADD CONSTRAINT "central_user_audit_events_pkey" PRIMARY KEY ("operation_id");



ALTER TABLE ONLY "public"."certificate_logs"
    ADD CONSTRAINT "certificate_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificate_main_video"
    ADD CONSTRAINT "certificate_main_video_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."house"
    ADD CONSTRAINT "house_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_notifications"
    ADD CONSTRAINT "line_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_facilities"
    ADD CONSTRAINT "listing_facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_prices"
    ADD CONSTRAINT "listing_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "no_overlapping_bookings" EXCLUDE USING "gist" ("listings_id" WITH =, "during" WITH &&);



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_uid_unique" UNIQUE ("uid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."quotation_company_payment_methods"
    ADD CONSTRAINT "quotation_company_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_company_payment_methods"
    ADD CONSTRAINT "quotation_company_payment_methods_user_id_position_key" UNIQUE ("user_id", "position");



ALTER TABLE "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_branch_number_valid" CHECK ((("office_type" <> 'branch'::"text") OR ("btrim"("branch_number") <> ''::"text"))) NOT VALID;



ALTER TABLE "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_office_type_valid" CHECK (("office_type" = ANY (ARRAY['head_office'::"text", 'branch'::"text", 'unspecified'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_tax_id_valid" CHECK (("tax_id" ~ '^[0-9]{13}$'::"text")) NOT VALID;



ALTER TABLE ONLY "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."quotation_customers"
    ADD CONSTRAINT "quotation_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_document_template_revisions"
    ADD CONSTRAINT "quotation_document_template_revisions_pkey" PRIMARY KEY ("template_id", "revision_number");



ALTER TABLE ONLY "public"."quotation_document_templates"
    ADD CONSTRAINT "quotation_document_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_document_templates"
    ADD CONSTRAINT "quotation_document_templates_user_id_template_key_key" UNIQUE ("user_id", "template_key");



ALTER TABLE ONLY "public"."quotation_item_catalog"
    ADD CONSTRAINT "quotation_item_catalog_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."quotation_item_catalog"
    ADD CONSTRAINT "quotation_item_catalog_sort_order_key" UNIQUE ("sort_order");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_position_key" UNIQUE ("quotation_id", "position");



ALTER TABLE "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_vat_treatment_rate_valid" CHECK (((("vat_treatment" = 'taxable'::"text") AND ("vat_rate" = ANY (ARRAY[(0)::numeric, (7)::numeric]))) OR (("vat_treatment" = 'none'::"text") AND ("vat_rate" = (0)::numeric)))) NOT VALID;



ALTER TABLE "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_vat_treatment_valid" CHECK (("vat_treatment" = ANY (ARRAY['taxable'::"text", 'none'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."quotation_payment_methods"
    ADD CONSTRAINT "quotation_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_payment_methods"
    ADD CONSTRAINT "quotation_payment_methods_quotation_id_position_key" UNIQUE ("quotation_id", "position");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_document_number_key" UNIQUE ("document_number");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_public_token_key" UNIQUE ("public_token");



ALTER TABLE "public"."quotations"
    ADD CONSTRAINT "quotations_snapshot_input_rules_valid" CHECK ((("jsonb_typeof"("seller_snapshot") = 'object'::"text") AND ("jsonb_typeof"("customer_snapshot") = 'object'::"text") AND (COALESCE(("seller_snapshot" ->> 'taxId'::"text"), ''::"text") ~ '^[0-9]{13}$'::"text") AND (COALESCE(("customer_snapshot" ->> 'taxId'::"text"), ''::"text") ~ '^[0-9]{13}$'::"text") AND (COALESCE(("seller_snapshot" ->> 'officeType'::"text"), ''::"text") = ANY (ARRAY['head_office'::"text", 'branch'::"text", 'unspecified'::"text"])) AND (COALESCE(("customer_snapshot" ->> 'officeType'::"text"), ''::"text") = ANY (ARRAY['head_office'::"text", 'branch'::"text", 'unspecified'::"text"])) AND ((("seller_snapshot" ->> 'officeType'::"text") <> 'branch'::"text") OR ("btrim"(COALESCE(("seller_snapshot" ->> 'branchNumber'::"text"), ''::"text")) <> ''::"text")) AND ((("customer_snapshot" ->> 'officeType'::"text") <> 'branch'::"text") OR ("btrim"(COALESCE(("customer_snapshot" ->> 'branchNumber'::"text"), ''::"text")) <> ''::"text")))) NOT VALID;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_dv_id_unique" UNIQUE ("dv_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "advertisement_images_advertisement_id_idx" ON "public"."advertisement_images" USING "btree" ("advertisement_id");



CREATE INDEX "advertisements_active_updated_idx" ON "public"."advertisements" USING "btree" ("is_active" DESC, "updated_at" DESC);



CREATE INDEX "advertisements_zone_active_updated_idx" ON "public"."advertisements" USING "btree" ("zone", "is_active" DESC, "updated_at" DESC);



CREATE INDEX "central_user_audit_tenant_time_idx" ON "public"."central_user_audit_events" USING "btree" ("tenant_id", "created_at" DESC);



CREATE UNIQUE INDEX "certificate_main_video_singleton" ON "public"."certificate_main_video" USING "btree" ((true));



CREATE INDEX "idx_agent_accounts_agent_id" ON "public"."agent_accounts" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_accounts_bank_id" ON "public"."agent_accounts" USING "btree" ("bank_id");



CREATE INDEX "idx_agents_created_at" ON "public"."agents" USING "btree" ("created_at");



CREATE INDEX "idx_agents_is_active" ON "public"."agents" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_banks_sort_order" ON "public"."banks" USING "btree" ("sort_order");



CREATE INDEX "idx_certificate_logs_action" ON "public"."certificate_logs" USING "btree" ("action");



CREATE INDEX "idx_certificate_logs_created_at" ON "public"."certificate_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "listing_facilities_listing_id_idx" ON "public"."listing_facilities" USING "btree" ("listing_id");



CREATE INDEX "listings_active_sort_property_idx" ON "public"."listings" USING "btree" ("sort_order", "property_id") WHERE "is_active";



CREATE INDEX "quotation_company_payment_methods_bank_id_idx" ON "public"."quotation_company_payment_methods" USING "btree" ("bank_id");



CREATE INDEX "quotation_customers_active_name_idx" ON "public"."quotation_customers" USING "btree" ("is_active", "lower"("name"), "updated_at" DESC);



CREATE UNIQUE INDEX "quotation_customers_owner_individual_tax_id_uidx" ON "public"."quotation_customers" USING "btree" ("owner_id", "tax_id") WHERE ("customer_type" = 'individual'::"text");



CREATE UNIQUE INDEX "quotation_customers_owner_juristic_branch_uidx" ON "public"."quotation_customers" USING "btree" ("owner_id", "tax_id", "branch_number") WHERE (("customer_type" = 'juristic'::"text") AND ("office_type" = 'branch'::"text"));



CREATE UNIQUE INDEX "quotation_customers_owner_juristic_main_tax_id_uidx" ON "public"."quotation_customers" USING "btree" ("owner_id", "tax_id") WHERE (("customer_type" = 'juristic'::"text") AND ("office_type" <> 'branch'::"text"));



CREATE INDEX "quotation_document_templates_user_id_idx" ON "public"."quotation_document_templates" USING "btree" ("user_id");



CREATE INDEX "quotation_items_name_idx" ON "public"."quotation_items" USING "btree" ("name");



CREATE INDEX "quotation_items_quotation_position_idx" ON "public"."quotation_items" USING "btree" ("quotation_id", "position");



CREATE INDEX "quotations_active_document_idx" ON "public"."quotations" USING "btree" ("document_number") WHERE ("deleted_at" IS NULL);



CREATE INDEX "quotations_active_updated_idx" ON "public"."quotations" USING "btree" ("updated_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "quotations_company_profile_id_idx" ON "public"."quotations" USING "btree" ("company_profile_id");



CREATE OR REPLACE TRIGGER "on_agents_updated" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_certificate_main_video_updated" BEFORE UPDATE ON "public"."certificate_main_video" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "quotation_company_profiles_provision_document_templates" AFTER INSERT ON "public"."quotation_company_profiles" FOR EACH ROW EXECUTE FUNCTION "private"."provision_quotation_document_templates"();



CREATE OR REPLACE TRIGGER "quotation_customers_touch" BEFORE UPDATE ON "public"."quotation_customers" FOR EACH ROW EXECUTE FUNCTION "private"."touch_quotation_customer"();



ALTER TABLE ONLY "public"."advertisement_images"
    ADD CONSTRAINT "advertisement_images_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_accounts"
    ADD CONSTRAINT "agent_accounts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_accounts"
    ADD CONSTRAINT "agent_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bedroom_facility"
    ADD CONSTRAINT "bedroom_facility_bedroom_id_fkey" FOREIGN KEY ("bedroom_id") REFERENCES "public"."bedroom"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bedroom"
    ADD CONSTRAINT "bedroom_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."house"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bedroom_image"
    ADD CONSTRAINT "bedroom_image_bedroom_id_fkey" FOREIGN KEY ("bedroom_id") REFERENCES "public"."bedroom"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."house"
    ADD CONSTRAINT "house_h_owner_fkey" FOREIGN KEY ("h_owner") REFERENCES "public"."users"("dv_id");



ALTER TABLE ONLY "public"."listing_facilities"
    ADD CONSTRAINT "listing_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."listing_facilities"
    ADD CONSTRAINT "listing_facilities_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_prices"
    ADD CONSTRAINT "listing_prices_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_uid_fkey" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_company_payment_methods"
    ADD CONSTRAINT "quotation_company_payment_methods_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotation_company_payment_methods"
    ADD CONSTRAINT "quotation_company_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_company_profiles"
    ADD CONSTRAINT "quotation_company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_document_template_revisions"
    ADD CONSTRAINT "quotation_document_template_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotation_document_template_revisions"
    ADD CONSTRAINT "quotation_document_template_revisions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."quotation_document_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_document_templates"
    ADD CONSTRAINT "quotation_document_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_name_catalog_fk" FOREIGN KEY ("name") REFERENCES "public"."quotation_item_catalog"("name") ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_payment_methods"
    ADD CONSTRAINT "quotation_payment_methods_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."quotation_company_profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_document_template_source_id_fkey" FOREIGN KEY ("document_template_source_id") REFERENCES "public"."quotation_document_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_uid_fkey" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Administrators can manage advertisement images" ON "public"."advertisement_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."allow_tools" @> '{"allow_accommodation": true}'::"jsonb") AND (("users"."uid" = "auth"."uid"()) OR (("users"."email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."allow_tools" @> '{"allow_accommodation": true}'::"jsonb") AND (("users"."uid" = "auth"."uid"()) OR (("users"."email")::"text" = ("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "Administrators can manage advertisements" ON "public"."advertisements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."allow_tools" @> '{"allow_accommodation": true}'::"jsonb") AND (("users"."uid" = "auth"."uid"()) OR (("users"."email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."allow_tools" @> '{"allow_accommodation": true}'::"jsonb") AND (("users"."uid" = "auth"."uid"()) OR (("users"."email")::"text" = ("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "Authenticated can use images" ON "public"."images" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."listings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read active advertisement images" ON "public"."advertisement_images" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."advertisements"
  WHERE (("advertisements"."id" = "advertisement_images"."advertisement_id") AND ("advertisements"."is_active" = true)))));



CREATE POLICY "Public can read active advertisements" ON "public"."advertisements" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Quotation owners manage company profiles" ON "public"."quotation_company_profiles" TO "authenticated" USING (("private"."has_quotation_permission"() AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("private"."has_quotation_permission"() AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Quotation owners manage quotations" ON "public"."quotations" TO "authenticated" USING (("private"."has_quotation_permission"() AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (("private"."has_quotation_permission"() AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Quotation owners read items" ON "public"."quotation_items" FOR SELECT TO "authenticated" USING ((( SELECT "private"."has_quotation_permission"() AS "has_quotation_permission") AND (EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_items"."quotation_id") AND ("q"."created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."deleted_at" IS NULL))))));



CREATE POLICY "Quotation owners read payment masters" ON "public"."quotation_company_payment_methods" FOR SELECT TO "authenticated" USING (("private"."has_quotation_permission"() AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Quotation owners read payment snapshots" ON "public"."quotation_payment_methods" FOR SELECT TO "authenticated" USING (("private"."has_quotation_permission"() AND (EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_payment_methods"."quotation_id") AND ("q"."created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."deleted_at" IS NULL))))));



CREATE POLICY "Quotation users read item catalogue" ON "public"."quotation_item_catalog" FOR SELECT TO "authenticated" USING (( SELECT "private"."has_quotation_permission"() AS "has_quotation_permission"));



CREATE POLICY "Quotation users read owned document template revisions" ON "public"."quotation_document_template_revisions" FOR SELECT TO "authenticated" USING ((( SELECT "private"."has_quotation_permission"() AS "has_quotation_permission") AND (EXISTS ( SELECT 1
   FROM "public"."quotation_document_templates" "template"
  WHERE (("template"."id" = "quotation_document_template_revisions"."template_id") AND ("template"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Quotation users read owned document templates" ON "public"."quotation_document_templates" FOR SELECT TO "authenticated" USING ((( SELECT "private"."has_quotation_permission"() AS "has_quotation_permission") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Quotation users read their customers" ON "public"."quotation_customers" FOR SELECT TO "authenticated" USING ((( SELECT "private"."has_quotation_permission"() AS "has_quotation_permission") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Users can read own row" ON "public"."users" FOR SELECT TO "authenticated" USING (("uid" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "uid"));



ALTER TABLE "public"."advertisement_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow advertisement_images" ON "public"."advertisement_images" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "allow advertisements" ON "public"."advertisements" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "allow delete" ON "public"."facilities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "allow delete" ON "public"."listing_prices" FOR DELETE USING (true);



CREATE POLICY "allow images" ON "public"."images" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "allow insert" ON "public"."facilities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow insert" ON "public"."listing_facilities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow insert" ON "public"."listing_prices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow insert" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow select" ON "public"."facilities" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "allow selected" ON "public"."listing_facilities" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "allow selected" ON "public"."listing_prices" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "allow updated" ON "public"."facilities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow updated" ON "public"."listing_facilities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow updated" ON "public"."listing_prices" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "anon: read active agents" ON "public"."agents" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "anon: read agent_accounts of active agents" ON "public"."agent_accounts" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "agent_accounts"."agent_id") AND ("agents"."is_active" = true)))));



CREATE POLICY "anon: read banks" ON "public"."banks" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon: read certificate_main_video" ON "public"."certificate_main_video" FOR SELECT TO "anon" USING (true);



CREATE POLICY "auth: delete agent_accounts" ON "public"."agent_accounts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth: delete agents" ON "public"."agents" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth: insert agent_accounts" ON "public"."agent_accounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth: insert agents" ON "public"."agents" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth: insert certificate_logs" ON "public"."certificate_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth: insert certificate_main_video" ON "public"."certificate_main_video" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth: read all agent_accounts" ON "public"."agent_accounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth: read all agents" ON "public"."agents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth: read banks" ON "public"."banks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth: read certificate_logs" ON "public"."certificate_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth: read certificate_main_video" ON "public"."certificate_main_video" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth: update agent_accounts" ON "public"."agent_accounts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth: update agents" ON "public"."agents" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth: update certificate_main_video" ON "public"."certificate_main_video" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bedroom" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bedroom_facility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bedroom_image" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."central_user_audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificate_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificate_main_video" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."house" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_company_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_company_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_document_template_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_document_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_item_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_public" ON "public"."advertisement_images" FOR SELECT TO "anon" USING (true);



CREATE POLICY "select_public" ON "public"."advertisements" FOR SELECT TO "anon" USING (true);



CREATE POLICY "select_public" ON "public"."images" FOR SELECT TO "anon" USING (true);



CREATE POLICY "selected" ON "public"."users" FOR SELECT TO "anon" USING (true);



CREATE POLICY "update policies allow" ON "public"."listings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "private" TO "authenticated";
GRANT USAGE ON SCHEMA "private" TO "anon";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."canonical_quotation_layout_v1"("p_template_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."current_quotation_company_profile_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_quotation_company_profile_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."ensure_quotation_document_templates"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."get_public_quotation"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."get_public_quotation"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."get_public_quotation"("p_token" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."has_quotation_permission"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_quotation_permission"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_quotation_document_display"("value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_quotation_document_display"("value" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_quotation_layout"("p_value" "jsonb", "p_template_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_quotation_layout_v1"("p_value" "jsonb", "p_template_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_quotation_template"("value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_quotation_template"("value" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."next_quotation_number"("p_issue_date" "date") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."normalize_quotation_certification"("p_value" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."provision_quotation_document_templates"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."save_quotation"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation"("p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."save_quotation_company_certification"("p_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation_company_certification"("p_value" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."validate_quotation_payment_asset_url"("p_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."validate_quotation_payment_asset_url"("p_url" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_company_payment_methods" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_company_payment_methods" TO "authenticated";



REVOKE ALL ON FUNCTION "private"."save_quotation_company_payment_methods"("p_methods" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation_company_payment_methods"("p_methods" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."save_quotation_with_document_display"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation_with_document_display"("p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."save_quotation_with_payments"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation_with_payments"("p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."save_quotation_with_template"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_quotation_with_template"("p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."soft_delete_quotation"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."soft_delete_quotation"("p_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."validate_quotation_certification_asset_url"("p_url" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_quotation_payment_method"("p_method" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."configure_quotation_payment_asset_origin"("p_origin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."configure_quotation_payment_asset_origin"("p_origin" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_quotation"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_quotation"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_quotation"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_quotation"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_villa_zones"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_villa_zones"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_villa_zones"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_quotation_customers"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_quotation_customers"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_quotation_customers"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_quotations"("p_search" "text", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_quotations"("p_search" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_quotations"("p_search" "text", "p_page" integer, "p_page_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."publish_quotation_document_template_layout"("p_template_key" "text", "p_expected_revision_number" bigint, "p_layout_config" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_quotation_document_template_layout"("p_template_key" "text", "p_expected_revision_number" bigint, "p_layout_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_quotation_document_template_layout"("p_template_key" "text", "p_expected_revision_number" bigint, "p_layout_config" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rotate_quotation_public_token"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_quotation_public_token"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_quotation_public_token"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_quotation"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_quotation"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_quotation"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_quotation_company_certification"("p_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_quotation_company_certification"("p_value" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_quotation_company_certification"("p_value" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_quotation_company_payment_methods"("p_methods" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_quotation_company_payment_methods"("p_methods" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_quotation_company_payment_methods"("p_methods" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_quotation_with_payments"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_quotation_with_payments"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_quotation_with_payments"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."soft_delete_quotation"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."soft_delete_quotation"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_quotation"("p_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_images" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_images" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_images" TO "service_role";



GRANT ALL ON TABLE "public"."advertisements" TO "anon";
GRANT ALL ON TABLE "public"."advertisements" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements" TO "service_role";



GRANT ALL ON TABLE "public"."agent_accounts" TO "anon";
GRANT ALL ON TABLE "public"."agent_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."banks" TO "service_role";
GRANT SELECT ON TABLE "public"."banks" TO "anon";
GRANT SELECT ON TABLE "public"."banks" TO "authenticated";



GRANT ALL ON TABLE "public"."bedroom" TO "anon";
GRANT ALL ON TABLE "public"."bedroom" TO "authenticated";
GRANT ALL ON TABLE "public"."bedroom" TO "service_role";



GRANT ALL ON TABLE "public"."bedroom_facility" TO "anon";
GRANT ALL ON TABLE "public"."bedroom_facility" TO "authenticated";
GRANT ALL ON TABLE "public"."bedroom_facility" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bedroom_facility_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bedroom_facility_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bedroom_facility_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bedroom_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bedroom_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bedroom_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bedroom_image" TO "anon";
GRANT ALL ON TABLE "public"."bedroom_image" TO "authenticated";
GRANT ALL ON TABLE "public"."bedroom_image" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bedroom_image_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bedroom_image_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bedroom_image_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."booking_logs" TO "anon";
GRANT ALL ON TABLE "public"."booking_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."central_user_audit_events" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_logs" TO "anon";
GRANT ALL ON TABLE "public"."certificate_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_logs" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_main_video" TO "anon";
GRANT ALL ON TABLE "public"."certificate_main_video" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_main_video" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."house" TO "anon";
GRANT ALL ON TABLE "public"."house" TO "authenticated";
GRANT ALL ON TABLE "public"."house" TO "service_role";



GRANT ALL ON TABLE "public"."images" TO "authenticated";
GRANT ALL ON TABLE "public"."images" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."images" TO "anon";



GRANT ALL ON SEQUENCE "public"."images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."line_notifications" TO "anon";
GRANT ALL ON TABLE "public"."line_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."line_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."listing_facilities" TO "anon";
GRANT ALL ON TABLE "public"."listing_facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_facilities" TO "service_role";



GRANT ALL ON TABLE "public"."listing_prices" TO "anon";
GRANT ALL ON TABLE "public"."listing_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_prices" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_company_profiles" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."quotation_company_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_company_profiles" TO "service_role";



GRANT INSERT("seller_name"),UPDATE("seller_name") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("address"),UPDATE("address") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("tax_id"),UPDATE("tax_id") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("office_type"),UPDATE("office_type") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("branch_number"),UPDATE("branch_number") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("phone"),UPDATE("phone") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("email"),UPDATE("email") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("website"),UPDATE("website") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("contact_name"),UPDATE("contact_name") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("contact_phone"),UPDATE("contact_phone") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("contact_email"),UPDATE("contact_email") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("logo_url"),UPDATE("logo_url") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("updated_at"),UPDATE("updated_at") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT INSERT("user_id"),UPDATE("user_id") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT SELECT("document_display_defaults"),INSERT("document_display_defaults"),UPDATE("document_display_defaults") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT SELECT("document_template_default"),UPDATE("document_template_default") ON TABLE "public"."quotation_company_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_customers" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_customers" TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_document_template_revisions" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_document_template_revisions" TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_document_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_document_templates" TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_item_catalog" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_item_catalog" TO "authenticated";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_payment_methods" TO "service_role";
GRANT SELECT ON TABLE "public"."quotation_payment_methods" TO "authenticated";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
