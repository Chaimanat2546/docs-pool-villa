// One-time wording amendment: only remove numbered task prefixes from headings.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {amendmentSql} from './beginner-transform.mjs';
import {validateDocumentContent} from '../../../src/lib/docs/content.ts';
const base='.wrangler/manuals/baan-pool-villa/';
const get=n=>JSON.parse(readFileSync(base+n,'utf8'));
const put=(n,v)=>writeFileSync(base+n,typeof v==='string'?v:JSON.stringify(v,null,2));
const env=parseEnv(readFileSync('.env','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'https://rqizfiayvcbozlzuvbok.supabase.co');
const read=async table=>{const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+table+'?select=*&order=id',{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}});assert.equal(r.status,200);return r.json();};
const all=await read('doc_documents'),media=await read('doc_media');
const manifest=get('manifest.json');
if(process.argv[2]==='prepare'){
 assert.ok(!existsSync(base+'plain-headings-docs.json'));
 let count=0;
 const docs=manifest.flatMap(m=>{
  const before=all.find(d=>d.id===m.documentId);assert.ok(before);
  const content=structuredClone(before.content);let changed=0;
  for(const node of content.content.filter(n=>n.type==='heading'))for(const text of node.content??[])if(/^งานที่ \d+ /.test(text.text??'')){text.text=text.text.replace(/^งานที่ \d+ /,'');changed++;}
  if(!changed)return[];
  assert.equal(validateDocumentContent(content,'persisted').ok,true);
  assert.deepEqual(content.content.filter(n=>n.type!=='heading'),before.content.content.filter(n=>n.type!=='heading'));
  count+=changed;return[{id:before.id,before,content,url:m.url}];
 });
 assert.equal(count,40);assert.equal(docs.length,13);
 put('plain-headings-before.json',all);put('plain-headings-media.json',media);put('plain-headings-docs.json',docs);
 const sql=amendmentSql(docs);
 put('plain-headings-publish.sql',"begin; set local lock_timeout='5s'; set local statement_timeout='30s';\n"+sql+'\ncommit;');
 const seed=readFileSync(base+'beginner-stage.sql','utf8').replace(/rollback;\s*$/,'');
 put('plain-headings-stage.sql',seed+'\n'+sql.replaceAll('https://docs-media.poolvilla.workers.dev','https://docs-media-staging.chaymanus2003.workers.dev')+'\nrollback;');
 console.log(JSON.stringify({headings:count,documents:docs.length,nonHeadingContentUnchanged:true}));
}else if(process.argv[2]==='verify'){
 const docs=get('plain-headings-docs.json');
 for(const d of docs){const live=all.find(x=>x.id===d.id);assert.deepEqual(live.content,d.content);assert.equal(live.version,d.before.version+1);assert.equal(live.status,'published');
  const page=await fetch(d.url);assert.equal(page.status,200);const html=await page.text();
  for(const n of d.content.content.filter(n=>n.type==='heading')){assert.ok(!/^งานที่ \d+ /.test(n.content[0].text));assert.ok(html.includes(n.content[0].text));}
 }
 for(const old of get('plain-headings-before.json').filter(x=>!docs.some(d=>d.id===x.id)))assert.deepEqual(all.find(x=>x.id===old.id),old);
 assert.deepEqual(media,get('plain-headings-media.json'));
 put('plain-headings-verification.json',{checkedAt:new Date().toISOString(),headings:40,documents:docs.length,untouchedDocuments:all.length-docs.length,mediaUnchanged:media.length});
 console.log(JSON.stringify(get('plain-headings-verification.json')));
}else throw Error('Use prepare or verify');
