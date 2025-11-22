const pdfParseModule = require('pdf-parse');
const fs = require('fs');

async function test() {
  const pdfBuffer = fs.readFileSync('./test_sample.pdf');
  console.log('Testing with real PDF file, size:', pdfBuffer.length);
  
  try {
    const PDFParse = pdfParseModule.PDFParse;
    console.log('PDFParse constructor:', typeof PDFParse);
    const parser = new PDFParse({data: pdfBuffer});
    console.log('Parser created');
    
    const result = await parser.getInfo();
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
