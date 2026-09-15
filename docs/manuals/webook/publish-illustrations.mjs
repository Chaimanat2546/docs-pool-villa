import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import sharp from 'sharp';
import { validateDocumentContent } from '../../../src/lib/docs/content.ts';
import { signMediaUploadTicket, signMediaDeleteTicket } from '../../../src/lib/media/upload-ticket.ts';
import { illustrations } from './illustrations.mjs';
import { addIllustration, publishImages } from './image-content.mjs';

const base = resolve('.wrangler/manuals/webook');
const mode = process.argv[2] ?? 'prepare';
const production = { ref: 'rqizfiayvcbozlzuvbok', env: '.env', media: 'https://docs-media.poolvilla.workers.dev', origin: 'https://docs-pool-villa.poolvilla.workers.dev' };
const staging = { ref: 'sxvkhzhqtrpxgzumsswl', env: '.env.local', media: 'https://docs-media-staging.chaymanus2003.workers.dev', origin: 'https://docs-pool-villa-staging.chaymanus2003.workers.dev' };
const envFor = target => {
  const env = parseEnv(readFileSync(target.env, 'utf8'));
  if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${target.ref}.supabase.co` || !env.DOCS_MEDIA_UPLOAD_SECRET) throw Error('Environment target mismatch');
  return env;
};
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const manifest = JSON.parse(readFileSync(resolve(base, 'manifest.json'), 'utf8'));
const ids = manifest.map(x => x.id);
async function readPublic(table, select, filter, target = production) {
  const env = envFor(target);
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filter}`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Public read failed: ${response.status}`);
  return response.json();
}
async function upload(item, target) {
  const env = envFor(target);
  const bytes = readFileSync(resolve('docs/manuals/webook/images', item.slug + '.webp'));
  if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw Error('Reviewed image changed');
  const ticket = await signMediaUploadTicket({ documentId: item.documentId, mediaId: item.mediaId, objectKey: item.objectKey, contentType: 'image/webp', byteSize: bytes.length, width: item.width, height: item.height, expiresAt: Date.now() + 300000 }, env.DOCS_MEDIA_UPLOAD_SECRET);
  const response = await fetch(target.media + '/uploads', { method: 'PUT', headers: { Origin: target.origin, 'Content-Type': 'image/webp', 'X-Docs-Media-Ticket': ticket }, body: bytes, signal: AbortSignal.timeout(30000) });
  if (response.status !== 201) throw Error(`Upload failed ${item.slug}: ${response.status}`);
  const stored = await response.json();
  if (stored.objectKey !== item.objectKey || stored.sizeBytes !== item.sizeBytes || stored.width !== item.width || stored.height !== item.height) throw Error('Upload metadata mismatch');
}
async function cleanup(item, target) {
  const ticket = await signMediaDeleteTicket({ operation: 'delete', operationId: randomUUID(), operationType: 'cleanup', documentId: item.documentId, objectKeys: [item.objectKey], expiresAt: Date.now() + 300000 }, envFor(target).DOCS_MEDIA_UPLOAD_SECRET);
  const response = await fetch(target.media + '/objects', { method: 'DELETE', headers: { 'X-Docs-Media-Ticket': ticket }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Cleanup failed: ${response.status}`);
}
function statements(items, docs, target) {
  return items.flatMap(item => {
    const doc = docs.find(x => x.id === item.documentId);
    const url = target.media + '/objects/' + item.objectKey;
    const content = addIllustration(doc.content, item.heading, { mediaId: item.mediaId, src: url, alt: item.alt, width: item.width, height: item.height }, item.caption);
    const valid = validateDocumentContent(content, 'persisted');
    if (!valid.ok) throw Error(valid.error);
    return [
      `do $guard$ begin if not exists(select 1 from public.doc_documents where id=${quote(doc.id)} and version=${Number(doc.version)} and content=${quote(JSON.stringify(doc.content))}::jsonb and status='published') then raise exception 'Document changed; refusing stale write'; end if; if exists(select 1 from public.doc_media where document_id=${quote(doc.id)}) then raise exception 'Existing media; review manually'; end if; end $guard$;`,
      `insert into public.doc_media(id,document_id,object_key,public_url,mime_type,size_bytes,width,height) values(${quote(item.mediaId)},${quote(doc.id)},${quote(item.objectKey)},${quote(url)},'image/webp',${item.sizeBytes},${item.width},${item.height});`,
      `update public.doc_documents set content=${quote(JSON.stringify(content))}::jsonb,version=version+1 where id=${quote(doc.id)} and version=${Number(doc.version)};`,
    ];
  });
}

if (mode === 'prepare') {
  const docs = await readPublic('doc_documents', 'id,title,slug,version,content,status', `id=in.(${ids.join(',')})`);
  if (docs.length !== 16 || illustrations.length !== 16) throw Error('Expected 16 published documents');
  const existingMedia = await readPublic('doc_media', 'id', `document_id=in.(${ids.join(',')})`);
  if (existingMedia.length) throw Error('Existing media; refusing a second import');
  const items = [];
  for (const illustration of illustrations) {
    const entry = manifest.find(x => x.slug === illustration.slug);
    const doc = docs.find(x => x.id === entry?.id);
    if (!doc || doc.title !== entry.title || doc.status !== 'published') throw Error('Unexpected document target');
    const bytes = readFileSync(resolve('docs/manuals/webook/images', illustration.slug + '.webp'));
    const meta = await sharp(bytes).metadata();
    if (meta.format !== 'webp' || meta.width > 1920 || meta.height > 1920 || bytes.length > 10485760) throw Error('Invalid image');
    const mediaId = randomUUID();
    items.push({ ...illustration, documentId: doc.id, mediaId, objectKey: `docs/${doc.id}/${mediaId}.webp`, sizeBytes: bytes.length, width: meta.width, height: meta.height, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  writeFileSync(resolve(base, 'before-images.json'), JSON.stringify(docs, null, 2));
  writeFileSync(resolve(base, 'image-manifest.json'), JSON.stringify(items, null, 2));
  const locks = `select id from public.doc_documents where id in (${ids.map(quote).join(',')}) order by id for update;`;
  const start = ['begin;', "set local lock_timeout='5s';", "set local statement_timeout='30s';", locks];
  const assertion = `do $check$ begin if (select count(*) from public.doc_media where id in (${items.map(x => quote(x.mediaId)).join(',')})) <> 16 then raise exception 'Incomplete image import'; end if; end $check$;`;
  writeFileSync(resolve(base, 'publish-images.sql'), [...start, ...statements(items, docs, production), assertion, 'commit;'].join('\n'));
  const seed = readFileSync(resolve(base, 'staging-check.sql'), 'utf8').replace(/rollback;\s*$/, '');
  // Staging starts from the original reviewed text only, not production user data.
  writeFileSync(resolve(base, 'staging-images.sql'), [seed, locks, ...statements(items, docs, staging), assertion, 'rollback;'].join('\n'));
  console.log(JSON.stringify({ prepared: items.length, totalBytes: items.reduce((n,x)=>n+x.sizeBytes,0), validated: true }));
} else if (mode === 'staging-media') {
  const item = JSON.parse(readFileSync(resolve(base, 'image-manifest.json'), 'utf8'))[0];
  // A disposable staging-only key; never send production credentials to staging.
  item.mediaId = randomUUID(); item.objectKey = `docs/${item.documentId}/${item.mediaId}.webp`;
  try {
    await upload(item, staging);
    const response = await fetch(staging.media + '/objects/' + item.objectKey);
    if (!response.ok || (await response.arrayBuffer()).byteLength !== item.sizeBytes) throw Error('Staging media read failed');
  } finally { await cleanup(item, staging); }
  const check = await fetch(staging.media + '/objects/' + item.objectKey + '?verify=' + Date.now());
  if (check.status !== 404) throw Error('Staging cleanup not verified');
  console.log('Staging upload/read/delete passed; disposable image removed');
} else if (mode === 'publish') {
  const items = JSON.parse(readFileSync(resolve(base, 'image-manifest.json'), 'utf8'));
  const { spawn } = await import('node:child_process');
  const db = file => new Promise((resolvePromise, reject) => {
    // Fixed arguments and generated local SQL file only; no credential on argv.
    const child = spawn('npx', ['--yes', 'supabase@latest', 'db', 'query', '--linked', '--project-ref', production.ref, '--file', file], { shell: process.platform === 'win32', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output=''; child.stdout.on('data', x => output += x); child.stderr.on('data', x => output += x);
    child.on('error', reject); child.on('close', code => code === 0 ? resolvePromise() : reject(Error('DB content update failed: ' + output.slice(-1500))));
  });
  for (const item of items) {
    const response = await fetch(production.media + '/objects/' + item.objectKey);
    if (response.status !== 404) throw Error('New object key already exists or cannot be checked');
  }
  await publishImages(items, {
    upload: async item => { await upload(item, production); console.log('Uploaded: ' + item.slug); },
    save: () => db('.wrangler/manuals/webook/publish-images.sql'),
    committed: async () => {
      const rows = await readPublic('doc_media', 'id', `id=in.(${items.map(x=>x.mediaId).join(',')})`);
      if (rows.length !== 0 && rows.length !== 16) throw Error('Partial commit state; manual review required');
      return rows.length === 16;
    },
    cleanup: item => cleanup(item, production),
    recordCleanup: async item => {
      const sql=`insert into public.doc_media_cleanup(document_id,object_key,display_label,last_error) values(${quote(item.documentId)},${quote(item.objectKey)},${quote(item.slug+'.webp')},'cleanup_required: manual image import failed') on conflict(object_key) do nothing;`;
      const path=resolve(base,'cleanup-required.sql'); writeFileSync(path,sql);
      await db('.wrangler/manuals/webook/cleanup-required.sql');
    },
  });
  console.log('Published 16 illustrations');
} else throw Error('Unknown mode');
