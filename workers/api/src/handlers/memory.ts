import { Hono } from 'hono';
import type {
  AppEnv,
  MemoryEvent,
  MemoryEventWithSimilarity,
  SemanticSearchRequest,
  SemanticSearchResponse,
} from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { generateEmbedding, getEmbeddingModel, OpenAIError } from '../lib/openai';
import {
  jsonResponse,
  paginatedResponse,
  parsePaginationParams,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../lib/response';
import { getAgentById, isValidAgentId } from './agents';

const app = new Hono<AppEnv>();

function formatMemoryEvent(row: Record<string, unknown>): MemoryEvent {
  return {
    id: row.id as string,
    agent: row.agent as string,
    memory_type: row.memory_type as MemoryEvent['memory_type'],
    content: extractContent(row.payload as Record<string, unknown>),
    tags: (row.tags as string[]) || [],
    metadata: (row.metadata as Record<string, unknown>) || {},
    session_id: row.session_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | null,
  };
}

function extractContent(payload: Record<string, unknown>): string {
  if (!payload) return '';
  if (typeof payload.content === 'string') return payload.content;
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.summary === 'string') return payload.summary;
  if (typeof payload.description === 'string') return payload.description;
  return JSON.stringify(payload).slice(0, 500);
}

app.get('/:agentId/memory', async (c) => {
  const agentId = c.req.param('agentId');

  if (!isValidAgentId(agentId)) {
    const agent = getAgentById(agentId);
    if (!agent) {
      return notFoundResponse(`Agent '${agentId}'`);
    }
  }

  try {
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);

    const supabase = getSupabaseClient(c.env);

    const agentName = getAgentById(agentId)?.name || agentId.toUpperCase();

    const { data, error, count } = await supabase
      .from('memory_events')
      .select('*', { count: 'exact' })
      .eq('agent', agentName)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching memory events:', error);
      return serverErrorResponse('Failed to fetch memory events');
    }

    const formattedData = (data || []).map(formatMemoryEvent);

    return paginatedResponse<MemoryEvent>(formattedData, count || 0, { limit, offset });
  } catch (error) {
    console.error('Memory fetch error:', error);
    return serverErrorResponse('Failed to fetch memory events');
  }
});

app.post('/:agentId/memory/semantic-search', async (c) => {
  const agentId = c.req.param('agentId');

  if (!isValidAgentId(agentId)) {
    const agent = getAgentById(agentId);
    if (!agent) {
      return notFoundResponse(`Agent '${agentId}'`);
    }
  }

  let body: SemanticSearchRequest;
  try {
    body = await c.req.json<SemanticSearchRequest>();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  if (!body.query || typeof body.query !== 'string') {
    return badRequestResponse('Missing or invalid "query" field');
  }

  const limit = Math.min(Math.max(body.limit || 20, 1), 100);

  try {
    const embeddingResult = await generateEmbedding(body.query, c.env);

    const supabase = getSupabaseClient(c.env);
    const agentName = getAgentById(agentId)?.name || agentId.toUpperCase();

    const { data, error } = await supabase.rpc('search_memories_by_embedding', {
      query_embedding: embeddingResult.embedding,
      match_threshold: 0.0,
      match_count: limit,
      filter_agent: agentName,
    });

    if (error) {
      console.error('Semantic search error:', error);
      return serverErrorResponse('Failed to perform semantic search');
    }

    const results: MemoryEventWithSimilarity[] = (data || []).map(
      (row: Record<string, unknown> & { similarity: number }) => ({
        ...formatMemoryEvent(row),
        similarity: row.similarity,
      })
    );

    const response: SemanticSearchResponse = {
      data: results,
      query: body.query,
      model: getEmbeddingModel(),
    };

    return jsonResponse(response);
  } catch (error) {
    if (error instanceof OpenAIError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
          status: error.status,
        },
        error.status
      );
    }
    console.error('Semantic search error:', error);
    return serverErrorResponse('Failed to perform semantic search');
  }
});

export default app;
