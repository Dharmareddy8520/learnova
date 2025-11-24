/**
 * Download Utilities
 * 
 * Helper functions to download content as files (text, JSON, etc.)
 */

/**
 * Download text content as a .txt file
 */
export function downloadAsText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.txt') ? filename : `${filename}.txt`);
}

/**
 * Download JSON content as a .json file
 */
export function downloadAsJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

/**
 * Download quiz as formatted text
 */
export function downloadQuizAsText(quiz: any[], filename: string) {
  let text = '# Quiz Questions\n\n';
  
  quiz.forEach((q, index) => {
    text += `Question ${index + 1}: ${q.question || q.q}\n\n`;
    
    if (q.options || q.choices) {
      const options = q.options || q.choices;
      options.forEach((option: string, i: number) => {
        const letter = String.fromCharCode(65 + i); // A, B, C, D
        text += `  ${letter}) ${option}\n`;
      });
      text += '\n';
    }
    
    if (q.answer !== undefined) {
      text += `Answer: ${q.answer}\n`;
    }
    
    if (q.correct !== undefined && (q.options || q.choices)) {
      const options = q.options || q.choices;
      text += `Correct Answer: ${options[q.correct]}\n`;
    }
    
    text += '\n---\n\n';
  });
  
  downloadAsText(text, filename);
}

/**
 * Download flashcards as formatted text
 */
export function downloadFlashcardsAsText(flashcards: any[], filename: string) {
  let text = '# Flashcards\n\n';
  
  flashcards.forEach((card, index) => {
    text += `Flashcard ${index + 1}:\n\n`;
    text += `Front: ${card.front || card.question}\n`;
    text += `Back: ${card.back || card.answer}\n`;
    text += '\n---\n\n';
  });
  
  downloadAsText(text, filename);
}

/**
 * Download Q&A history as formatted text
 */
export function downloadQAAsText(qaHistory: any[], filename: string) {
  let text = '# Q&A History\n\n';
  
  qaHistory.forEach((item, index) => {
    text += `Q&A ${index + 1}:\n\n`;
    text += `Question: ${item.question}\n\n`;
    text += `Answer: ${item.answer}\n`;
    
    if (item.score !== null && item.score !== undefined) {
      text += `Confidence: ${(item.score * 100).toFixed(1)}%\n`;
    }
    
    text += '\n---\n\n';
  });
  
  downloadAsText(text, filename);
}

/**
 * Generic blob download helper
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Smart download function that chooses the appropriate format based on content type
 */
export function downloadContent(
  content: any,
  type: 'summary' | 'quiz' | 'flashcard' | 'qa',
  title: string
) {
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  switch (type) {
    case 'summary':
      downloadAsText(content, `${sanitizedTitle}_summary`);
      break;
    case 'quiz':
      if (Array.isArray(content)) {
        downloadQuizAsText(content, `${sanitizedTitle}_quiz`);
      } else {
        downloadAsJSON(content, `${sanitizedTitle}_quiz`);
      }
      break;
    case 'flashcard':
      if (Array.isArray(content)) {
        downloadFlashcardsAsText(content, `${sanitizedTitle}_flashcards`);
      } else {
        downloadAsJSON(content, `${sanitizedTitle}_flashcards`);
      }
      break;
    case 'qa':
      if (Array.isArray(content)) {
        downloadQAAsText(content, `${sanitizedTitle}_qa`);
      } else {
        downloadAsJSON(content, `${sanitizedTitle}_qa`);
      }
      break;
    default:
      downloadAsJSON(content, sanitizedTitle);
  }
}
