// Read-only verification of the published Desktop content revision.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import sharp from 'sharp';
import { illustrations } from './illustrations.mjs';
import { articles } from './catalogue.mjs';
import { validateDocumentContent } from '../../../src/lib/docs/content.ts';

const base = '.wrangler/manuals/webook/';
const env = parseEnv(readFileSync('.env', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'https://rqizfiayvcbozlzuvbok.supabase.co');
const manifest = JSON.parse(readFileSync(base + 'manifest.json', 'utf8'));
const original = JSON.parse(readFileSync(base + 'before-images.json', 'utf8'));
const oldImages = JSON.parse(readFileSync(base + 'image-manifest.json', 'utf8'));
const replaced = new Set(['getting-started', 'menus-and-permissions', 'edit-house', 'base-prices', 'campaigns', 'customers', 'create-quotation', 'share-export-delete', 'templates-and-layout']);
async function publicRead(table, columns, filter) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=${columns}&${filter}`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200);
  return response.json();
}
function walk(node) { return [node, ...(node.content ?? []).flatMap(walk)]; }
const ids = manifest.map(x => x.id).join(',');
const docs = await publicRead('doc_documents', 'id,title,slug,version,status,content', `id=in.(${ids})`);
const media = await publicRead('doc_media', 'id,document_id,object_key,public_url,width,height,size_bytes', `document_id=in.(${ids})`);
assert.equal(docs.length, 16);
assert.equal(media.length, 16);
const results = await Promise.all(manifest.map(async entry => {
  const doc = docs.find(x => x.id === entry.id);
  const spec = illustrations.find(x => x.slug === entry.slug);
  const nodes = walk(doc.content);
  const images = nodes.filter(x => x.type === 'image');
  const text = nodes.filter(x => x.type === 'text').map(x => x.text).join('\n');
  assert.equal(doc.status, 'published', entry.slug);
  assert.equal(validateDocumentContent(doc.content, 'persisted').ok, true, entry.slug);
  assert.equal(/มือถือ|ตำแหน่งภาพประกอบ/.test(JSON.stringify(doc.content)), false, entry.slug);
  assert.equal(images.length, 1, entry.slug);
  assert.equal(images[0].attrs.alt, spec.alt, entry.slug);
  assert.ok(text.includes(spec.caption), entry.slug);
  const normalizeText = value => value.replace(/\s+/g, '');
  const expectedText = articles.find(x => x.slug === entry.slug).body
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '$1')
    .replace(/^(?:## |\d+\. |- |> )/gm, '');
  assert.equal(normalizeText(text.replace(spec.caption, '')), normalizeText(expectedText), `${entry.slug}: canonical text`);
  for (const type of ['heading', 'listItem', 'callout']) {
    assert.equal(nodes.filter(x => x.type === type).length,
      walk(original.find(x => x.id === entry.id).content).filter(x => x.type === type).length, `${entry.slug}: ${type}`);
  }
  const image = media.find(x => x.id === images[0].attrs.mediaId);
  assert.equal(image.document_id, entry.id);
  assert.ok(image.object_key.startsWith(`docs/${entry.id}/`));
  assert.equal(image.public_url, images[0].attrs.src);
  const response = await fetch(image.public_url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  const info = await sharp(bytes).metadata();
  assert.equal(info.format, 'webp');
  assert.equal(info.width, image.width);
  assert.equal(info.height, image.height);
  assert.equal(bytes.length, Number(image.size_bytes));
  const page = await fetch(entry.url, { signal: AbortSignal.timeout(30000) });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes(entry.title), entry.slug);
  assert.ok(html.includes(image.id), entry.slug);
  let oldImageStatus = null;
  if (replaced.has(entry.slug)) {
    const old = oldImages.find(x => x.slug === entry.slug);
    assert.notEqual(old.mediaId, image.id);
    oldImageStatus = (await fetch(`https://docs-media.poolvilla.workers.dev/objects/${old.objectKey}?verify=${Date.now()}`, { signal: AbortSignal.timeout(30000) })).status;
    assert.equal(oldImageStatus, 404, entry.slug);
  }
  return { slug: entry.slug, version: doc.version, pageStatus: page.status, mediaId: image.id, width: image.width, height: image.height, oldImageStatus };
}));
writeFileSync(base + 'desktop-verification.json', JSON.stringify(results, null, 2));
writeFileSync(base + 'after-desktop.json', JSON.stringify(docs, null, 2));
console.log(JSON.stringify({ published: results.length, validImages: media.length, replacedOldImages404: results.filter(x => x.oldImageStatus === 404).length, results }, null, 2));
