import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDocumentContent } from '../../../src/lib/docs/content.ts';
import { articles, sections } from './catalogue.mjs';

const origin = 'https://docs-pool-villa.poolvilla.workers.dev';
const output = resolve('.wrangler/manuals/webook');
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
function id(value) {
  const bytes = createHash('sha256').update('webook-manual-2026-09-15/' + value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function inline(value) {
  const nodes = [];
  const pattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > offset) nodes.push({ type: 'text', text: value.slice(offset, match.index) });
    nodes.push({ type: 'text', text: match[1], marks: [{ type: 'link', attrs: { href: match[2] } }] });
    offset = match.index + match[0].length;
  }
  if (offset < value.length) nodes.push({ type: 'text', text: value.slice(offset) });
  return nodes;
}
const paragraph = (text) => ({ type: 'paragraph', content: inline(text) });
function convert(markdown) {
  const nodes = [];
  for (const block of markdown.trim().split(/\n\s*\n/)) {
    if (block.startsWith('## ')) {
      const [heading, ...rest] = block.split('\n');
      nodes.push({ type: 'heading', attrs: { level: 2 }, content: inline(heading.slice(3)) });
      if (rest.length) nodes.push(...convert(rest.join('\n')).content);
    } else if (/^\d+\. /.test(block) || block.startsWith('- ')) {
      const ordered = /^\d+\. /.test(block);
      const lines = block.split('\n');
      if (!lines.every((line) => ordered ? /^\d+\. /.test(line) : line.startsWith('- '))) throw Error('Mixed list block');
      nodes.push({ type: ordered ? 'orderedList' : 'bulletList', content: lines.map((line) => ({ type: 'listItem', content: [paragraph(line.replace(/^(?:\d+\.|-) /, ''))] })) });
    } else if (block.startsWith('> ')) {
      nodes.push({ type: 'callout', attrs: { kind: 'warning' }, content: [paragraph(block.slice(2))] });
    } else nodes.push(paragraph(block.replaceAll('\n', ' ')));
  }
  return { type: 'doc', content: nodes };
}

const rootId = id('webook');
const manifest = [];
const sql = [
  'begin;',
  "set local lock_timeout = '5s';",
  "set local statement_timeout = '30s';",
  "do $guard$ begin if exists (select 1 from public.doc_sections where parent_id is null and slug = 'webook') then raise exception 'WeBooks manual already exists; refusing to overwrite'; end if; end $guard$;",
  `insert into public.doc_sections(id,title,slug,sort_order,is_published) values (${quote(rootId)},'คู่มือ WeBooks','webook',(select coalesce(max(sort_order),-1)+1 from public.doc_sections where parent_id is null),true);`,
];
const knownSections = new Map(sections.map(([slug], index) => [slug, index]));
for (const [index, [slug, title]] of sections.entries()) {
  sql.push(`insert into public.doc_sections(id,parent_id,title,slug,sort_order,is_published) values (${quote(id(slug))},${quote(rootId)},${quote(title)},${quote(slug)},${index},true);`);
}
const seen = new Set();
for (const article of articles) {
  if (!knownSections.has(article.section)) throw Error('Unknown section');
  const path = `/webook/${article.section}/${article.slug}`;
  if (seen.has(path)) throw Error('Duplicate route');
  seen.add(path);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw Error('Invalid slug');
  const content = convert(article.body);
  const validation = validateDocumentContent(content, 'persisted');
  if (!validation.ok) throw Error(`${article.slug}: ${validation.error}`);
  const sortOrder = manifest.filter((entry) => entry.section === article.section).length;
  const documentId = id(path);
  manifest.push({ id: documentId, section: article.section, title: article.title, slug: article.slug, url: origin + path, contentBytes: Buffer.byteLength(JSON.stringify(content)), headings: content.content.filter((node) => node.type === 'heading').length });
  sql.push(`insert into public.doc_documents(id,section_id,title,slug,excerpt,content,status,published_at,sort_order) values (${quote(documentId)},${quote(id(article.section))},${quote(article.title)},${quote(article.slug)},${quote(article.excerpt)},${quote(JSON.stringify(content))}::jsonb,'published',now(),${sortOrder});`);
}
if (manifest.length !== 16) throw Error('Expected 16 reviewed articles');
const assertion = `do $verify$ begin if (select count(*) from public.doc_documents where id in (${manifest.map((entry) => quote(entry.id)).join(',')})) <> 16 then raise exception 'Incomplete manual import'; end if; end $verify$;`;
const summary = `select count(*) as imported_published_documents from public.doc_documents where status='published' and id in (${manifest.map((entry) => quote(entry.id)).join(',')});`;
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'publish.sql'), [...sql, assertion, summary, 'commit;'].join('\n'), 'utf8');
writeFileSync(resolve(output, 'staging-check.sql'), [...sql, assertion, summary, 'rollback;'].join('\n'), 'utf8');
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify({ articles: manifest.length, sections: sections.length + 1, contentValidation: 'passed', generatedDirectory: output, firstUrl: manifest[0].url }, null, 2));
