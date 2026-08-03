const fs = require('fs');
const PDFDocument = require('pdfkit');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

// inputPath: temp file written by multer (no useful extension of its own)
// ext: the real extension, taken from the customer's original filename
// outputPath: where to write the final, print-ready PDF
function convertToPrintablePdf(inputPath, ext, outputPath) {
  const normalizedExt = (ext || '').toLowerCase();

  if (normalizedExt === '.pdf') {
    fs.copyFileSync(inputPath, outputPath);
    return Promise.resolve(outputPath);
  }

  if (!IMAGE_EXTENSIONS.has(normalizedExt)) {
    return Promise.reject(
      new Error(`Unsupported file type: ${normalizedExt || 'unknown'}. Upload a PDF, JPG, or PNG.`)
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

    // pdfkit reads the image format from its own file header, not the
    // extension, so this works fine even though inputPath has no extension.
    doc.image(inputPath, doc.page.margins.left, doc.page.margins.top, {
      fit: [pageWidth, pageHeight],
      align: 'center',
      valign: 'center',
    });

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { convertToPrintablePdf };
