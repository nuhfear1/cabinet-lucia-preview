(() => {
  const images = [...document.querySelectorAll('img[data-binary-src]')];
  if (!images.length) return;

  const hydrateImage = async (image) => {
    const source = image.dataset.binarySrc;
    if (!source) return;

    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`${source}: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error(`${source}: type MIME invalide (${blob.type || 'absent'})`);
    }

    const objectUrl = URL.createObjectURL(blob);
    image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
    image.src = objectUrl;

    if (typeof image.decode === 'function') {
      await image.decode();
    }
  };

  Promise.all(images.map(hydrateImage)).catch((error) => {
    console.error('Impossible de charger une photographie éditoriale.', error);
  });
})();
