import type { Bindings } from '../types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
}

export class OpenAIError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.status = status;
    this.code = code;
  }
}

export async function generateEmbedding(
  text: string,
  env: Bindings
): Promise<EmbeddingResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new OpenAIError(
      'OPENAI_API_KEY is not configured. Semantic search requires an OpenAI API key.',
      503,
      'OPENAI_NOT_CONFIGURED'
    );
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string } })?.error?.message ||
      'Failed to generate embedding';
    throw new OpenAIError(
      errorMessage,
      response.status,
      'OPENAI_API_ERROR'
    );
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
    model: string;
  };

  if (!data.data?.[0]?.embedding) {
    throw new OpenAIError(
      'Invalid response from OpenAI API',
      500,
      'OPENAI_INVALID_RESPONSE'
    );
  }

  return {
    embedding: data.data[0].embedding,
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
  };
}

export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}

export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSION;
}
