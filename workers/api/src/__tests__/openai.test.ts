import { describe, it, expect } from 'vitest';
import { getEmbeddingModel, getEmbeddingDimension } from '../lib/openai';

describe('OpenAI Client', () => {
  describe('getEmbeddingModel', () => {
    it('should return the correct embedding model', () => {
      expect(getEmbeddingModel()).toBe('text-embedding-3-small');
    });
  });

  describe('getEmbeddingDimension', () => {
    it('should return the correct embedding dimension', () => {
      expect(getEmbeddingDimension()).toBe(1536);
    });
  });
});
