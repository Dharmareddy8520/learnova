const pdfParse = require('pdf-parse');
console.log('Type:', typeof pdfParse);
console.log('PDFParse class:', typeof pdfParse.PDFParse);
console.log('Has default:', !!pdfParse.default);

try {
  const parser = new pdfParse.PDFParse({data: Buffer.from([0x25, 0x50, 0x44, 0x46])});
  console.log('Parser created:', !!parser);
  console.log('Parser type:', parser.constructor.name);
} catch (e) {
  console.log('Error creating parser:', e.message);
}
