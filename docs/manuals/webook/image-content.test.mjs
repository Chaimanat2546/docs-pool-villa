import test from 'node:test';
import assert from 'node:assert/strict';
import { addIllustration, publishImages } from './image-content.mjs';

const original = { type: 'doc', content: [
  { type: 'paragraph', content: [{ type: 'text', text: 'Introduction' }] },
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Start' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Steps' }] },
] };
const image = { mediaId: '967c208d-9af9-4a88-b4af-cec2e630c466', src: 'https://docs-media.poolvilla.workers.dev/objects/docs/example.webp', alt: 'Example form', width: 300, height: 200 };
test('inserts image and caption under the selected heading without mutating original', () => {
  const value = addIllustration(original, 'Start', image, 'Caption');
  assert.equal(value.content[2].type, 'image');
  assert.equal(value.content[2].attrs.alt, image.alt);
  assert.equal(value.content[3].content[0].text, 'Caption');
  assert.equal(value.content[4].content[0].text, 'Steps');
  assert.equal(original.content.length, 3);
});
test('rejects a missing heading', () => assert.throws(() => addIllustration(original, 'Missing', image, 'Caption'), /heading/i));
test('rejects duplicate image insertion', () => {
  const value = addIllustration(original, 'Start', image, 'Caption');
  assert.throws(() => addIllustration(value, 'Start', image, 'Caption'), /already/i);
});
test('cleans all attempted new keys when an upload fails before saving', async () => {
  const attempted = [], cleaned = [];
  await assert.rejects(publishImages([1, 2], {
    upload: async x => { attempted.push(x); if(x === 2) throw Error('Upload failed'); },
    save: async () => { throw Error('Must not save'); },
    committed: async () => false,
    cleanup: async x => cleaned.push(x),
    recordCleanup: async () => { throw Error('Unexpected cleanup error'); },
  }), /Upload failed/);
  assert.deepEqual(attempted, [1, 2]); assert.deepEqual(cleaned, [1, 2]);
});
test('keeps images when a failed save response was actually committed', async () => {
  await publishImages([1], { upload: async () => {}, save: async () => { throw Error('Lost response'); }, committed: async () => true, cleanup: async () => { throw Error('Must not delete committed media'); } });
});
test('records cleanup_required when uncommitted media cannot be removed', async () => {
  const pending=[];
  await assert.rejects(publishImages([1], { upload: async () => {}, save: async () => { throw Error('Save failed'); }, committed: async () => false, cleanup: async () => { throw Error('Delete failed'); }, recordCleanup: async x => pending.push(x) }), /Save failed/);
  assert.deepEqual(pending,[1]);
});
test('does not delete media if commit state is unknown', async () => {
  await assert.rejects(publishImages([1], { upload: async () => {}, save: async () => { throw Error('Lost response'); }, committed: async () => { throw Error('Verification unavailable'); }, cleanup: async () => { throw Error('Must not delete'); } }), /Verification unavailable/);
});
