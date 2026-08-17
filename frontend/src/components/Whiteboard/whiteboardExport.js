import { jsPDF } from 'jspdf';

/**
 * Converts a Blob to a Base64 Data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers a direct browser file download from a Blob
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a clean, sanitized filename with a timestamp
 */
export function getExportFilename(title = 'whiteboard', format = 'png') {
  const sanitizedTitle = (title || 'whiteboard')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  return `${sanitizedTitle}_${dateStr}_${timeStr}.${format}`;
}

/**
 * Main export function supporting PNG, JPEG, SVG, and high-res PDF.
 */
export async function exportWhiteboard(editor, options = {}) {
  if (!editor) {
    throw new Error('Editor instance is required for export');
  }

  const {
    format = 'png', // 'png' | 'jpeg' | 'svg' | 'pdf'
    scope = 'all', // 'all' | 'selection'
    scale = 2, // 1 (1x), 2 (2x HD), 3 (3x Ultra HD)
    includeBackground = true,
    pdfFormat = 'fit', // 'fit' | 'a4'
    title = 'whiteboard',
    isDarkMode = false,
    padding = 32
  } = options;

  // 1. Resolve Target Shape IDs
  let targetShapeIds = [];
  if (scope === 'selection') {
    targetShapeIds = editor.getSelectedShapeIds ? editor.getSelectedShapeIds() : [];
  }

  if (!targetShapeIds || targetShapeIds.length === 0) {
    const allIds = editor.getCurrentPageShapeIds ? editor.getCurrentPageShapeIds() : [];
    targetShapeIds = Array.from(allIds);
  }

  if (targetShapeIds.length === 0) {
    throw new Error('There are no shapes to export on this whiteboard.');
  }

  const filename = getExportFilename(title, format);

  // 2. SVG Vector Export
  if (format === 'svg') {
    const svgResult = await editor.getSvgString(targetShapeIds, {
      scale: 1,
      background: includeBackground,
      padding,
      darkMode: isDarkMode
    });

    if (!svgResult || !svgResult.svg) {
      throw new Error('Failed to generate SVG vector graphics.');
    }

    const svgBlob = new Blob([svgResult.svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(svgBlob, filename);
    return { success: true, filename, format };
  }

  // 3. High-Quality Raster Export (PNG / JPEG)
  if (format === 'png' || format === 'jpeg') {
    const { blob } = await editor.toImage(targetShapeIds, {
      format,
      scale,
      quality: format === 'jpeg' ? 0.96 : 1,
      background: format === 'jpeg' ? true : includeBackground,
      padding,
      darkMode: isDarkMode
    });

    if (!blob) {
      throw new Error(`Failed to generate ${format.toUpperCase()} image.`);
    }

    downloadBlob(blob, filename);
    return { success: true, filename, format };
  }

  // 4. High-Resolution PDF Export
  if (format === 'pdf') {
    // Render at high resolution (scale 2 or 3) for crisp printing and display
    const renderScale = Math.max(scale, 2);
    const { blob, width, height } = await editor.toImage(targetShapeIds, {
      format: 'png',
      scale: renderScale,
      background: includeBackground,
      padding,
      darkMode: isDarkMode
    });

    if (!blob || !width || !height) {
      throw new Error('Failed to render whiteboard image for PDF conversion.');
    }

    const imgDataUrl = await blobToDataURL(blob);

    let doc;
    const isLandscape = width >= height;

    if (pdfFormat === 'a4') {
      // Standard A4 Layout with auto-scaling to fit margins
      doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10; // 10mm margin
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      const imgAspect = width / height;
      let finalW = availWidth;
      let finalH = availWidth / imgAspect;

      if (finalH > availHeight) {
        finalH = availHeight;
        finalW = availHeight * imgAspect;
      }

      const posX = margin + (availWidth - finalW) / 2;
      const posY = margin + (availHeight - finalH) / 2;

      doc.addImage(imgDataUrl, 'PNG', posX, posY, finalW, finalH, undefined, 'FAST');
    } else {
      // Fit to exact diagram aspect ratio (in mm, 1 px = 0.264583 mm)
      // Logical unscaled dimensions in mm
      const logicalWidthMm = (width / renderScale) * 0.264583;
      const logicalHeightMm = (height / renderScale) * 0.264583;

      doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [Math.max(logicalWidthMm, 50), Math.max(logicalHeightMm, 50)]
      });

      doc.addImage(imgDataUrl, 'PNG', 0, 0, logicalWidthMm, logicalHeightMm, undefined, 'FAST');
    }

    doc.save(filename);
    return { success: true, filename, format: 'pdf' };
  }

  throw new Error(`Unsupported export format: ${format}`);
}
