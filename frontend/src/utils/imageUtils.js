/**
 * Extracts all image URLs from an HTML string.
 * @param {string} html - The HTML string to parse.
 * @returns {string[]} Array of image src URLs.
 */
export const extractImagesFromHtml = (html) => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img'));
  return imgs.map(img => img.getAttribute('src')).filter(Boolean);
};

/**
 * Deletes a list of image URLs from the backend.
 * @param {string[]} urls - Array of image src URLs.
 */
export const deleteImages = async (urls) => {
  for (const url of urls) {
    if (url.includes('/api/attachments/')) {
      const fileName = url.split('/api/attachments/')[1];
      try {
        await fetch(`/api/attachments/${fileName}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete image:', fileName, e);
      }
    }
  }
};
