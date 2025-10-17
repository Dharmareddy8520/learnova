import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function processDocument(filePath: string): Promise<string> {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'txt':
      return fs.readFileSync(filePath, 'utf-8');
    case 'pdf':
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfData.text;
    case 'docx':
      const docxBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      return result.value;
    default:
      throw new Error('Unsupported file type');
  }
}
