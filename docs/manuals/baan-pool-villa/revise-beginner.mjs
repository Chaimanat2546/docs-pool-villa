// Content-only preparation and read-only verification. SQL execution is explicit
// and separate. Does not upload/delete media or touch application configuration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {bodies} from './beginner-content.mjs';
import {transform,amendmentSql} from './beginner-transform.mjs';
import {validateDocumentContent} from '../../../src/lib/docs/content.ts';
const base='.wrangler/manuals/baan-pool-villa/';
const prodMedia='https://docs-media.poolvilla.workers.dev';
const stageMedia='https://docs-media-staging.chaymanus2003.workers.dev';
const hash=x=>createHash('sha256').update(x).digest('hex');
const get=name=>JSON.parse(readFileSync(base+name,'utf8'));
const put=(name,value)=>writeFileSync(base+name,typeof value==='string'?value:JSON.stringify(value,null,2));
const e=parseEnv(readFileSync('.env','utf8'));
assert.equal(e.NEXT_PUBLIC_SUPABASE_URL,'https://rqizfiayvcbozlzuvbok.supabase.co');
const read=async table=>{
 assert.ok(['doc_documents','doc_media'].includes(table));
 const r=await fetch(`${e.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*&order=id`,{headers:{apikey:e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200);return r.json();
};
const [all,media]=await Promise.all([read('doc_documents'),read('doc_media')]);
const manifest=get('manifest.json');
const source=hash(readFileSync('docs/manuals/baan-pool-villa/beginner-content.mjs'));
const images=content=>content.content.filter(n=>n.type==='image').sort((a,b)=>a.attrs.mediaId.localeCompare(b.attrs.mediaId));
const mode=process.argv[2];
if(mode==='prepare'){
 assert.ok(!existsSync(base+'beginner-before-all.json'),'Prepared snapshot exists; do not overwrite');
 assert.equal(Object.keys(bodies).length,14);
 const docs=manifest.map(m=>{
  const before=all.find(d=>d.id===m.documentId);assert.ok(before);assert.equal(before.status,'published');
  const content=transform(before.content,bodies[m.slug]);
  const validation=validateDocumentContent(content,'persisted');assert.equal(validation.ok,true,m.slug+JSON.stringify(validation));
  assert.deepEqual(images(content),images(before.content));
  for(const image of images(content))assert.ok(media.some(row=>row.id===image.attrs.mediaId&&row.document_id===before.id&&row.public_url===image.attrs.src));
  return{id:before.id,slug:m.slug,url:m.url,before,content};
 });
 assert.equal(docs.reduce((n,d)=>n+images(d.content).length,0),20);
 put('beginner-before-all.json',all);put('beginner-before-media.json',media);put('beginner-docs.json',docs);
 const start="begin;\nset local lock_timeout='5s';\nset local statement_timeout='30s';\n";
 const sql=amendmentSql(docs);
 put('beginner-publish.sql',start+sql+'\ncommit;');
 const stageDocs=JSON.parse(JSON.stringify(docs).replaceAll(prodMedia,stageMedia));
 const seed=readFileSync(base+'sections-images-stage.sql','utf8').replace(/rollback;\s*$/,'');
 put('beginner-stage.sql',seed+'\n'+amendmentSql(stageDocs)+'\nrollback;');
 // Apply the same update twice inside the disposable stage transaction. The
 // second update must fail its old-version guard and roll back the whole run.
 put('beginner-conflict-stage.sql',seed+'\n'+amendmentSql(stageDocs)+'\n'+amendmentSql([stageDocs[0]])+'\nrollback;');
 put('beginner-hash.json',{source,sql:hash(readFileSync(base+'beginner-publish.sql'))});
 console.log('Prepared 14 replacements; 20 owned images retained; guarded SQL and staging conflict fixture ready');
}else{
 const docs=get('beginner-docs.json'),review=get('beginner-hash.json');
 assert.equal(source,review.source);assert.equal(hash(readFileSync(base+'beginner-publish.sql')),review.sql);
 if(mode==='preflight'){
  for(const d of docs)assert.deepEqual(all.find(x=>x.id===d.id),d.before,'Concurrent edit: '+d.slug);
  assert.deepEqual(media,get('beginner-before-media.json'));
  console.log('Exact target content/version and all media unchanged since preparation');
 }else if(mode==='verify'){
  for(const d of docs){
   const live=all.find(x=>x.id===d.id);assert.deepEqual(live.content,d.content,d.slug);assert.equal(live.version,d.before.version+1);assert.equal(live.status,'published');
   for(const key of ['title','slug','section_id','excerpt','sort_order','published_at','created_by','created_at','updated_by'])assert.deepEqual(live[key],d.before[key],d.slug+':'+key);
   const page=await fetch(d.url,{signal:AbortSignal.timeout(30000)});assert.equal(page.status,200,d.url);const html=await page.text();
   for(const node of d.content.content.filter(n=>n.type==='heading'))assert.ok(html.includes(node.content[0].text),d.slug+': missing heading');
   for(const image of images(d.content)){
    assert.ok(html.includes(image.attrs.alt),d.slug+': image alt absent');
    const row=media.find(x=>x.id===image.attrs.mediaId);const r=await fetch(row.public_url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);
    const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,row.size_bytes);
   }
  }
  for(const old of get('beginner-before-all.json').filter(x=>!docs.some(d=>d.id===x.id)))assert.deepEqual(all.find(x=>x.id===old.id),old,'Untouched document changed');
  assert.deepEqual(media,get('beginner-before-media.json'),'Media metadata changed');
  put('beginner-verification.json',{checkedAt:new Date().toISOString(),revised:docs.length,existingImagesRetained:20,unchangedOtherDocuments:all.length-docs.length,unchangedMediaRows:media.length});
  console.log(JSON.stringify(get('beginner-verification.json')));
 }else throw Error('Use prepare, preflight, or verify');
}
