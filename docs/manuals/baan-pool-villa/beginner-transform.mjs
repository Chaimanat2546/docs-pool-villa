import assert from 'node:assert/strict';
const text=s=>({type:'text',text:s});
const paragraph=s=>({type:'paragraph',content:[text(s)]});
export function transform(content, body) {
 const illustrations=content.content.flatMap((node,i)=>node.type==='image'?[[node,content.content[i+1]]]:[]);
 const used=new Set();
 const nodes=body.trim().split(/\n\s*\n/).flatMap(block=>{
  const marker=block.match(/^%%image:(\d+)%%$/);
  if(marker){const index=Number(marker[1]);assert.ok(illustrations[index]&&!used.has(index),'Unknown or duplicate image');used.add(index);assert.equal(illustrations[index][1]?.type,'paragraph','Missing existing caption');return structuredClone(illustrations[index]);}
  if(block.startsWith('## '))return[{type:'heading',attrs:{level:2},content:[text(block.slice(3))]}];
  if(block.startsWith('> '))return[{type:'callout',attrs:{kind:'warning'},content:[paragraph(block.slice(2))]}];
  if(/^(?:\d+\.|-) /.test(block))return[{type:/^\d/.test(block)?'orderedList':'bulletList',content:block.split('\n').map(line=>({type:'listItem',content:[paragraph(line.replace(/^(?:\d+\.|-) /,''))]}))}];
  assert.ok(!block.includes('%%image:'),'Malformed image marker');return[paragraph(block)];
 });
 assert.equal(used.size,illustrations.length,'All existing images must be retained');
 return{type:'doc',content:nodes};
}
export function amendmentSql(docs) {
 const q=value=>"'"+String(value).replaceAll("'","''")+"'";
 return docs.map(d=>`do $amend$ begin
update public.doc_documents set content=${q(JSON.stringify(d.content))}::jsonb,version=version+1
where id=${q(d.id)} and version=${Number(d.before.version)} and content=${q(JSON.stringify(d.before.content))}::jsonb and status='published';
if not found then raise exception 'Document changed; abort all updates'; end if;
end $amend$;`).join('\n');
}
