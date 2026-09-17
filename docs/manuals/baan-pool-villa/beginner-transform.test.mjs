import test from 'node:test';
import assert from 'node:assert/strict';
import {transform, amendmentSql} from './beginner-transform.mjs';
const image={type:'image',attrs:{mediaId:'a',src:'https://example.com/a.webp',alt:'ภาพเดิม',width:100,height:100}};
const caption={type:'paragraph',content:[{type:'text',text:'คำบรรยายเดิม'}]};
const original={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'old'}]},image,caption]};
test('replacement relocates the owned image and caption without mutating original',()=>{
 const result=transform(original,'## ทางเข้า\n\n1. คลิก\n2. ตรวจ\n\n%%image:0%%\n\n> ระวัง');
 assert.equal(result.content[0].type,'heading');
 assert.equal(result.content[1].type,'orderedList');
 assert.equal(result.content[1].content.length,2);
 assert.deepEqual(result.content.slice(2,4),[image,caption]);
 assert.equal(result.content[4].type,'callout');
 assert.equal(original.content[0].content[0].text,'old');
});
test('missing, repeated and unknown image references fail instead of deleting or duplicating media',()=>{
 for(const body of ['text','%%image:0%%\n\n%%image:0%%','%%image:1%%']) assert.throws(()=>transform(original,body));
});
test('SQL targets exact document/version/content and raises on zero-row concurrent update',()=>{
 const sql=amendmentSql([{id:'00000000-0000-4000-8000-000000000001',before:{version:2,content:{type:'doc',content:[]}},content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:"A's"}]}]}}]);
 assert.match(sql,/id='00000000-0000-4000-8000-000000000001'/);
 assert.match(sql,/version=2/);assert.match(sql,/content=.*::jsonb/);
 assert.match(sql,/status='published'/);assert.match(sql,/if not found then raise exception/i);
 assert.match(sql,/A''s/);assert.match(sql,/version=version\+1/);
 assert.doesNotMatch(sql,/delete|insert|doc_media/i);
});
