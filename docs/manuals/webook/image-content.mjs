export function addIllustration(original, heading, image, caption) {
  const value = structuredClone(original);
  if (JSON.stringify(value).includes('"mediaId"')) throw new Error('Document already has images; review manually');
  const index = value.content.findIndex(node => node.type === 'heading' && node.content?.map(child => child.text ?? '').join('') === heading);
  if (index < 0) throw new Error('Target heading not found');
  value.content.splice(index + 1, 0,
    { type: 'image', attrs: { ...image } },
    { type: 'paragraph', content: [{ type: 'text', text: caption }] },
  );
  return value;
}

// Uploads happen before the short DB transaction. A lost commit response is
// reconciled before cleanup, so a published image is never removed by mistake.
export async function publishImages(images, actions) {
  const attempted = [];
  let saveAttempted = false;
  try {
    for (const image of images) {
      attempted.push(image);
      await actions.upload(image);
    }
    saveAttempted = true;
    await actions.save();
  } catch (error) {
    if (saveAttempted && await actions.committed()) return;
    for (const image of attempted) {
      try { await actions.cleanup(image); }
      catch { await actions.recordCleanup(image); }
    }
    throw error;
  }
}
