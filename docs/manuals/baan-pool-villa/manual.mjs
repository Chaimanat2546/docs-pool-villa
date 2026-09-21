// One-time, insert-only content import. No app, schema, or legacy-data changes.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { articles, sections } from './catalogue.mjs';
import { addIllustration, publishImages } from '../webook/image-content.mjs';
import { validateDocumentContent } from '../../../src/lib/docs/content.ts';
import { signMediaUploadTicket, signMediaDeleteTicket } from '../../../src/lib/media/upload-ticket.ts';

const base = '.wrangler/manuals/baan-pool-villa/';
const imagesPath = 'docs/manuals/baan-pool-villa/images/';
const prod = { ref: 'rqizfiayvcbozlzuvbok', env: '.env', media: 'https://docs-media.poolvilla.workers.dev', origin: 'https://docs-pool-villa.poolvilla.workers.dev' };
const stage = { ref: 'sxvkhzhqtrpxgzumsswl', env: '.env.local', media: 'https://docs-media-staging.chaymanus2003.workers.dev', origin: 'https://docs-pool-villa-staging.chaymanus2003.workers.dev' };
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const hash = value => createHash('sha256').update(value).digest('hex');
const json = path => JSON.parse(readFileSync(base + path, 'utf8'));
const write = (path, value) => writeFileSync(base + path, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
function id(value) {
  const bytes = createHash('sha256').update('baan-pool-villa-manual-2026-09-15/' + value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function envFor(target) {
  const env = parseEnv(readFileSync(target.env, 'utf8'));
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, `https://${target.ref}.supabase.co`);
  assert.ok(env.DOCS_MEDIA_UPLOAD_SECRET && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return env;
}
async function readPublic(table, select, filter = '', target = prod) {
  assert.ok(['doc_documents','doc_sections','doc_media'].includes(table));
  const env = envFor(target);
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filter}`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, `Read ${table}`);
  return response.json();
}
function db(file, target) {
  assert.match(file, /^\.wrangler\/manuals\/baan-pool-villa\/[a-z-]+\.sql$/);
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes','supabase@latest','db','query','--linked','--project-ref',target.ref,'--file',file], {
      shell: process.platform === 'win32', windowsHide: true, stdio: ['ignore','pipe','pipe'],
    });
    let output = '';
    child.stdout.on('data', x => output += x); child.stderr.on('data', x => output += x);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(Error(`Content query failed: ${output.slice(-1500)}`)));
  });
}
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
function convert(markdown) {
  return { type: 'doc', content: markdown.trim().split(/\n\s*\n/).map(block => {
    if (block.startsWith('## ')) return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: block.slice(3) }] };
    if (block.startsWith('> ')) return { type: 'callout', attrs: { kind: 'warning' }, content: [paragraph(block.slice(2))] };
    const ordered = /^\d+\. /.test(block);
    if (ordered || block.startsWith('- ')) {
      const lines = block.split('\n');
      assert.ok(lines.every(line => ordered ? /^\d+\. /.test(line) : line.startsWith('- ')));
      return { type: ordered ? 'orderedList' : 'bulletList', content: lines.map(line => ({ type: 'listItem', content: [paragraph(line.replace(/^(?:\d+\.|-) /, ''))] })) };
    }
    return paragraph(block.replaceAll('\n', ' '));
  }) };
}
function contentFor(item, target) {
  const article = articles.find(x => x.slug === item.slug);
  const content = addIllustration(convert(article.body), 'รู้จักหน้าจอ', {
    mediaId: item.mediaId, src: target.media + '/objects/' + item.objectKey,
    alt: item.alt, width: item.width, height: item.height,
  }, article.caption);
  assert.equal(validateDocumentContent(content, 'persisted').ok, true, item.slug);
  return content;
}
function sqlFor(items, target, commit) {
  const rootId = id('root');
  const sql = ['begin;', "set local lock_timeout='5s';", "set local statement_timeout='30s';",
    "do $guard$ begin if exists(select 1 from public.doc_sections where parent_id is null and slug='baan-pool-villa') then raise exception 'Baan manual already exists; refusing overwrite'; end if; end $guard$;",
    `insert into public.doc_sections(id,title,slug,sort_order,is_published) values(${quote(rootId)},'คู่มือ Baan Pool Villa','baan-pool-villa',(select coalesce(max(sort_order),-1)+1 from public.doc_sections where parent_id is null),true);`,
  ];
  sections.forEach(([slug,title], index) => sql.push(`insert into public.doc_sections(id,parent_id,title,slug,sort_order,is_published) values(${quote(id(slug))},${quote(rootId)},${quote(title)},${quote(slug)},${index},true);`));
  for (const item of items) {
    const article = articles.find(x => x.slug === item.slug);
    const content = contentFor(item, target);
    sql.push(`insert into public.doc_documents(id,section_id,title,slug,excerpt,content,status,published_at,sort_order) values(${quote(item.documentId)},${quote(id(article.section))},${quote(article.title)},${quote(article.slug)},${quote(article.excerpt)},${quote(JSON.stringify(content))}::jsonb,'published',now(),${item.sortOrder});`);
    sql.push(`insert into public.doc_media(id,document_id,object_key,public_url,mime_type,size_bytes,width,height) values(${quote(item.mediaId)},${quote(item.documentId)},${quote(item.objectKey)},${quote(target.media + '/objects/' + item.objectKey)},'image/webp',${item.sizeBytes},${item.width},${item.height});`);
  }
  sql.push(`do $check$ begin if (select count(*) from public.doc_documents where id in (${items.map(x=>quote(x.documentId)).join(',')})) <> 14 or (select count(*) from public.doc_media where id in (${items.map(x=>quote(x.mediaId)).join(',')})) <> 14 then raise exception 'Incomplete import'; end if; end $check$;`);
  sql.push(commit ? 'commit;' : 'rollback;');
  return sql.join('\n');
}
async function upload(item, target) {
  const bytes = readFileSync(imagesPath + item.slug + '.webp');
  assert.equal(hash(bytes), item.sha256, 'Reviewed image changed');
  const ticket = await signMediaUploadTicket({ documentId:item.documentId, mediaId:item.mediaId, objectKey:item.objectKey, contentType:'image/webp', byteSize:bytes.length, width:item.width, height:item.height, expiresAt:Date.now()+300000 }, envFor(target).DOCS_MEDIA_UPLOAD_SECRET);
  const response = await fetch(target.media+'/uploads', { method:'PUT', headers:{Origin:target.origin,'Content-Type':'image/webp','X-Docs-Media-Ticket':ticket}, body:bytes, signal:AbortSignal.timeout(30000) });
  assert.equal(response.status,201,'Upload '+item.slug);
  const result=await response.json();
  assert.equal(result.objectKey,item.objectKey); assert.equal(result.sizeBytes,item.sizeBytes);
  assert.equal(result.width,item.width); assert.equal(result.height,item.height);
}
async function cleanup(item,target) {
  const ticket=await signMediaDeleteTicket({operation:'delete',operationId:randomUUID(),operationType:'cleanup',documentId:item.documentId,objectKeys:[item.objectKey],expiresAt:Date.now()+300000},envFor(target).DOCS_MEDIA_UPLOAD_SECRET);
  const response=await fetch(target.media+'/objects',{method:'DELETE',headers:{'X-Docs-Media-Ticket':ticket},signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok,'Cleanup '+item.slug);
}
async function recordCleanup(item,target) {
  // The cleanup ledger allows keys whose new document transaction rolled back.
  write('cleanup-required.sql',`insert into public.doc_media_cleanup(document_id,object_key,display_label,last_error) values(${quote(item.documentId)},${quote(item.objectKey)},${quote(item.slug+'.webp')},'cleanup_required: Baan manual import') on conflict(object_key) do nothing;`);
  await db(base+'cleanup-required.sql',target);
}
function assertUnchangedInputs(items) {
  assert.equal(hash(readFileSync('docs/manuals/baan-pool-villa/catalogue.mjs')),json('review.json').catalogueHash);
  for(const item of items) assert.equal(hash(readFileSync(imagesPath+item.slug+'.webp')),item.sha256);
  assert.equal(readFileSync(base+'publish.sql','utf8'),sqlFor(items,prod,true));
  assert.equal(readFileSync(base+'staging-check.sql','utf8'),sqlFor(items,stage,false));
}
const mode=process.argv[2]??'prepare';
mkdirSync(base,{recursive:true});
if(mode==='prepare') {
  assert.equal(articles.length,14); assert.equal(new Set(articles.map(x=>x.slug)).size,14);
  assert.equal(existsSync(base+'published.json'),false,'Already published');
  const items=[];
  for(const article of articles) {
    assert.ok(sections.some(([slug])=>slug===article.section)); assert.match(article.slug,/^[a-z0-9-]+$/);
    assert.ok(article.body.includes('## รู้จักหน้าจอ')); assert.ok(!/มือถือ|แตะ|TBD|TODO/.test(article.body));
    const bytes=readFileSync(imagesPath+article.slug+'.webp'); const meta=await sharp(bytes).metadata();
    assert.equal(meta.format,'webp'); assert.ok(meta.width<=1920&&meta.height<=1920&&bytes.length<=10485760);
    const documentId=id(article.section+'/'+article.slug),mediaId=id('image/'+article.slug);
    items.push({slug:article.slug,section:article.section,title:article.title,documentId,mediaId,objectKey:`docs/${documentId}/${mediaId}.webp`,width:meta.width,height:meta.height,sizeBytes:bytes.length,sha256:hash(bytes),alt:article.caption,sortOrder:items.filter(x=>x.section===article.section).length,url:prod.origin+'/baan-pool-villa/'+article.section+'/'+article.slug});
  }
  write('manifest.json',items); write('publish.sql',sqlFor(items,prod,true)); write('staging-check.sql',sqlFor(items,stage,false));
  write('review.json',{catalogueHash:hash(readFileSync('docs/manuals/baan-pool-villa/catalogue.mjs')),documents:items.length,images:items.length});
  console.log(JSON.stringify({prepared:14,images:14,totalBytes:items.reduce((n,x)=>n+x.sizeBytes,0),contentValidation:'passed'}));
} else if(mode==='staging') {
  const items=json('manifest.json'); assertUnchangedInputs(items);
  await db(base+'staging-check.sql',stage);
  const remaining=await readPublic('doc_sections','id','slug=eq.baan-pool-villa',stage); assert.equal(remaining.length,0);
  const sample={...items[0],mediaId:randomUUID()}; sample.objectKey=`docs/${sample.documentId}/${sample.mediaId}.webp`;
  try {
    await upload(sample,stage);
    const response=await fetch(stage.media+'/objects/'+sample.objectKey,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200); assert.equal(hash(Buffer.from(await response.arrayBuffer())),sample.sha256);
  } finally { try { await cleanup(sample,stage); } catch(error) { await recordCleanup(sample,stage); throw error; } }
  assert.equal((await fetch(stage.media+'/objects/'+sample.objectKey+'?verify='+Date.now())).status,404);
  write('staging-verified.json',{...json('review.json'),checkedAt:new Date().toISOString(),sqlRollback:true,mediaUploadReadDelete:true});
  console.log('Staging: 14 documents + 14 metadata rows validated and rolled back; disposable image upload/read/delete verified');
} else if(mode==='publish') {
  const items=json('manifest.json'); assertUnchangedInputs(items);
  assert.equal(json('staging-verified.json').catalogueHash,json('review.json').catalogueHash);
  assert.equal((await readPublic('doc_sections','id','slug=eq.baan-pool-villa')).length,0,'Existing root');
  const before=await readPublic('doc_documents','id,title,slug,version,content,status','order=id');
  write('existing-documents.json',before);
  for(const item of items) assert.equal((await fetch(prod.media+'/objects/'+item.objectKey+'?check='+Date.now(),{signal:AbortSignal.timeout(30000)})).status,404,'Existing key');
  await publishImages(items,{
    upload:async item=>{await upload(item,prod);console.log('Uploaded '+item.slug);},
    save:()=>db(base+'publish.sql',prod),
    committed:async()=>{const rows=await readPublic('doc_media','id',`id=in.(${items.map(x=>x.mediaId).join(',')})`);assert.ok(rows.length===0||rows.length===14,'Uncertain partial state');return rows.length===14;},
    cleanup:item=>cleanup(item,prod),recordCleanup:item=>recordCleanup(item,prod),
  });
  write('published.json',{publishedAt:new Date().toISOString(),documents:14,images:14});
  console.log('Published 14 new Baan manual documents and images');
} else if(mode==='verify') {
  const items=json('manifest.json'); assertUnchangedInputs(items);
  const docs=await readPublic('doc_documents','id,title,slug,version,content,status','order=id');
  const media=await readPublic('doc_media','id,document_id,object_key,public_url,size_bytes,width,height',`document_id=in.(${items.map(x=>x.documentId).join(',')})`);
  assert.equal(media.length,14);
  const before=json('existing-documents.json');
  assert.deepEqual(docs.filter(x=>before.some(y=>y.id===x.id)),before,'Existing manuals changed');
  const results=[];
  for(const item of items) {
    const doc=docs.find(x=>x.id===item.documentId);assert.ok(doc);assert.equal(doc.title,item.title);assert.equal(doc.status,'published');
    assert.deepEqual(doc.content,contentFor(item,prod));
    const image=media.find(x=>x.id===item.mediaId);assert.ok(image);assert.equal(image.document_id,item.documentId);assert.equal(image.object_key,item.objectKey);
    assert.equal(image.public_url,prod.media+'/objects/'+item.objectKey);assert.equal(image.width,item.width);assert.equal(image.height,item.height);assert.equal(Number(image.size_bytes),item.sizeBytes);
    const response=await fetch(image.public_url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),item.sha256);
    const page=await fetch(item.url,{signal:AbortSignal.timeout(30000)});assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes(item.title)&&html.includes(item.mediaId));
    results.push({slug:item.slug,page:200,image:200,canonicalContent:true});
  }
  const visibleSections=await readPublic('doc_sections','id,parent_id,slug,is_published');
  for(const sid of [id('root'),...sections.map(([slug])=>id(slug))]) assert.equal(visibleSections.find(x=>x.id===sid)?.is_published,true);
  write('verification.json',{checkedAt:new Date().toISOString(),existingDocumentsUnchanged:before.length,results});
  console.log(JSON.stringify({published:results.length,images:media.length,existingDocumentsUnchanged:before.length,allPagesAndImages:200,canonicalContent:'matched'}));
} else throw Error('Unknown mode');
