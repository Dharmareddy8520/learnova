import { describe, expect, test } from 'vitest';
import { normalizeFlashcards } from '../../components/FileUploadSummary';

describe('normalizeFlashcards', () => {
  test('handles array of strings', () => {
    const input = ['Point 1', 'Point 2', 'Point 3'];
    expect(normalizeFlashcards(input)).toEqual(['Point 1', 'Point 2', 'Point 3']);
  });

  test('handles array of objects (legacy)', () => {
    const input = [
      { front: 'A', back: '' },
      { question: 'B', answer: '' },
      { back: 'C' },
      { answer: 'D' },
    ];
    expect(normalizeFlashcards(input)).toEqual(['A', 'B', 'C', 'D']);
  });

  test('handles JSON string', () => {
    const input = '["A","B","C"]';
    expect(normalizeFlashcards(input)).toEqual(['A', 'B', 'C']);
  });

  test('handles numbered/bullet blocks', () => {
    const input = '1. First point\n2. Second point\n3. Third point';
    expect(normalizeFlashcards(input)).toEqual(['1. First point', '2. Second point', '3. Third point']);
  });

  test('handles Front:/Back: markers', () => {
    const input = 'Flashcard 1:\nFront: A\nBack: B\nFlashcard 2:\nFront: C\nBack: D';
    expect(normalizeFlashcards(input)).toEqual(['A', 'D']);
  });

  test('handles fallback to single string', () => {
    const input = 'Just a single point';
    expect(normalizeFlashcards(input)).toEqual(['Just a single point']);
  });
});
