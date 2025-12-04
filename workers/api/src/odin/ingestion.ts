/**
 * ODIN Web Ingestion v1.0
 * 
 * Service for ingesting web content into the ZORA Knowledge Store.
 * ODIN is the Nordic agent responsible for research and knowledge acquisition.
 * 
 * Features:
 * - Fetch web content via WebTool
 * - Extract and clean text content
 * - Generate summaries via LLM
 * - Create embeddings for semantic search
 * - Store documents in knowledge_documents table
 * 
 * This module provides pure functions that can be called from:
 * - Admin API endpoints (manual ingestion)
 * - Autonomy task executor (scheduled bootstrap jobs)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';
import type {
  IngestKnowledgeFromUrlInput,
  IngestKnowledgeResult,
  OdinIngestionJobInput,
  OdinIngestionJobResult,
  CreateKnowledgeDocumentInput,
} from '../types';
import { httpGet, WebToolError, isWebToolConfigured } from '../webtool';
import { insertKnowledgeDocument, isUrlAlreadyIngested } from '../lib/knowledgeStore';
import { generateEmbedding } from '../lib/openai';
import { logMetricEvent } from '../middleware/logging';

export const ODIN_INGESTION_VERSION = '1.0.0';

const MAX_CONTENT_LENGTH = 50000;
const MAX_EXCERPT_LENGTH = 10000;
const MAX_SUMMARY_LENGTH = 2000;

interface ContentExtractionResult {
  title: string;
  excerpt: string;
  wordCount: number;
}

/**
 * Extract clean text content from HTML
 */
function extractTextContent(html: string, url: string): ContentExtractionResult {
  let title = 'Untitled Document';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1].trim();
  }

  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH);
  }

  const excerpt = text.slice(0, MAX_EXCERPT_LENGTH);
  const wordCount = text.split(/\s+/).length;

  return { title, excerpt, wordCount };
}

/**
 * Generate a summary of the content using LLM
 */
async function generateSummary(
  content: string,
  domain: string,
  env: Bindings
): Promise<string> {
  const truncatedContent = content.slice(0, 8000);

  const systemPrompt = `You are ODIN, the Nordic research agent for ZORA CORE. Your role is to summarize web content for the ZORA knowledge base.

Generate a concise, informative summary (2-4 sentences) of the following content. Focus on:
- Key facts and data points
- Relevance to ${domain.replace(/_/g, ' ')}
- Climate and sustainability implications (if applicable)

Be factual and avoid speculation. If the content is not relevant or useful, say so briefly.`;

  const userPrompt = `Summarize this content:\n\n${truncatedContent}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const summary = data.choices[0]?.message?.content?.trim() || '';
    return summary.slice(0, MAX_SUMMARY_LENGTH);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'odin_ingestion',
      name: 'summary_generation_failed',
      success: false,
      error_code: 'SUMMARY_GENERATION_FAILED',
      metadata: { error: errorMessage, domain },
    });
    return '';
  }
}

/**
 * Assess quality of the extracted content
 */
function assessQuality(content: ContentExtractionResult, summary: string): number {
  let score = 0.5;

  if (content.wordCount > 100) score += 0.1;
  if (content.wordCount > 500) score += 0.1;
  if (content.wordCount > 1000) score += 0.1;

  if (content.title && content.title !== 'Untitled Document') score += 0.05;

  if (summary && summary.length > 50) score += 0.1;

  if (content.wordCount < 50) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Ingest a single URL into the knowledge store
 */
export async function ingestKnowledgeFromUrl(
  supabase: SupabaseClient,
  env: Bindings,
  input: IngestKnowledgeFromUrlInput
): Promise<IngestKnowledgeResult> {
  const startTime = Date.now();
  const agent = input.initiated_by_agent || 'ODIN';

  logMetricEvent({
    category: 'odin_ingestion',
    name: 'ingest_start',
    tenant_id: input.tenant_id || undefined,
    success: true,
    metadata: { url: input.url, domain: input.domain, agent },
  });

  try {
    if (!isWebToolConfigured(env)) {
      return {
        success: false,
        error_code: 'WEBTOOL_NOT_CONFIGURED',
        error_message: 'WebTool is not configured. Set ZORA_WEBTOOL_ALLOWED_DOMAINS.',
      };
    }

    const alreadyIngested = await isUrlAlreadyIngested(supabase, input.url, input.tenant_id);
    if (alreadyIngested) {
      return {
        success: false,
        error_code: 'URL_ALREADY_INGESTED',
        error_message: `URL has already been ingested: ${input.url}`,
      };
    }

    const webResult = await httpGet(input.url, env, {
      agent,
      tenantId: input.tenant_id || undefined,
    });

    if (webResult.status !== 200) {
      return {
        success: false,
        error_code: 'HTTP_ERROR',
        error_message: `HTTP ${webResult.status} when fetching URL`,
      };
    }

    const extracted = extractTextContent(webResult.text, input.url);

    if (extracted.wordCount < 20) {
      return {
        success: false,
        error_code: 'INSUFFICIENT_CONTENT',
        error_message: 'Page has insufficient text content for ingestion',
      };
    }

    const summary = await generateSummary(extracted.excerpt, input.domain, env);

    const qualityScore = assessQuality(extracted, summary);

    const embeddingText = `${extracted.title}\n\n${summary || extracted.excerpt.slice(0, 2000)}`;
    const embeddingResult = await generateEmbedding(embeddingText, env);

    const documentInput: CreateKnowledgeDocumentInput = {
      tenant_id: input.tenant_id ?? null,
      source_type: 'web_page',
      source_url: input.url,
      domain: input.domain,
      language: input.language || 'en',
      title: extracted.title,
      raw_excerpt: extracted.excerpt,
      summary: summary || undefined,
      embedding: embeddingResult.embedding,
      quality_score: qualityScore,
      curation_status: 'auto',
      ingested_by_agent: agent,
      ingested_by_user_id: input.initiated_by_user_id,
      tags: input.tags,
      metadata: {
        word_count: extracted.wordCount,
        fetch_duration_ms: webResult.durationMs,
        truncated: webResult.truncated,
      },
    };

    const document = await insertKnowledgeDocument(supabase, documentInput);

    const durationMs = Date.now() - startTime;

    logMetricEvent({
      category: 'odin_ingestion',
      name: 'ingest_success',
      tenant_id: input.tenant_id || undefined,
      duration_ms: durationMs,
      success: true,
      metadata: {
        url: input.url,
        domain: input.domain,
        document_id: document.id,
        quality_score: qualityScore,
        word_count: extracted.wordCount,
      },
    });

    return {
      success: true,
      document_id: document.id,
      title: extracted.title,
      summary: summary || undefined,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    let errorCode = 'INGESTION_ERROR';
    let errorMessage = 'Unknown error during ingestion';

    if (error instanceof WebToolError) {
      errorCode = error.code;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logMetricEvent({
      category: 'odin_ingestion',
      name: 'ingest_failed',
      tenant_id: input.tenant_id || undefined,
      duration_ms: durationMs,
      success: false,
      error_code: errorCode,
      metadata: { url: input.url, domain: input.domain, error_message: errorMessage },
    });

    return {
      success: false,
      error_code: errorCode,
      error_message: errorMessage,
    };
  }
}

/**
 * Bootstrap job definitions for ODIN knowledge ingestion
 */
export const ODIN_BOOTSTRAP_JOBS: Record<string, OdinIngestionJobInput> = {
  odin_bootstrap_climate_policy_knowledge: {
    topic: 'Climate Policy & Regulations',
    domain: 'climate_policy',
    language: 'en',
    tenant_id: null,
    max_documents: 10,
    urls: [
      'https://en.wikipedia.org/wiki/Paris_Agreement',
      'https://en.wikipedia.org/wiki/European_Green_Deal',
      'https://en.wikipedia.org/wiki/Carbon_neutrality',
      'https://en.wikipedia.org/wiki/Net_zero_emissions',
      'https://en.wikipedia.org/wiki/Greenhouse_gas_emissions',
    ],
  },
  odin_bootstrap_hemp_and_materials: {
    topic: 'Hemp & Sustainable Materials',
    domain: 'hemp_materials',
    language: 'en',
    tenant_id: null,
    max_documents: 10,
    urls: [
      'https://en.wikipedia.org/wiki/Hemp',
      'https://en.wikipedia.org/wiki/Industrial_hemp',
      'https://en.wikipedia.org/wiki/Hempcrete',
      'https://en.wikipedia.org/wiki/Sustainable_fashion',
      'https://en.wikipedia.org/wiki/Organic_cotton',
    ],
  },
  odin_bootstrap_household_energy: {
    topic: 'Household Energy Efficiency',
    domain: 'energy_efficiency',
    language: 'en',
    tenant_id: null,
    max_documents: 10,
    urls: [
      'https://en.wikipedia.org/wiki/Energy_conservation',
      'https://en.wikipedia.org/wiki/Home_energy_rating',
      'https://en.wikipedia.org/wiki/Heat_pump',
      'https://en.wikipedia.org/wiki/Solar_panel',
      'https://en.wikipedia.org/wiki/LED_lamp',
    ],
  },
  odin_bootstrap_sustainable_branding: {
    topic: 'Sustainable Branding & Fashion',
    domain: 'sustainable_fashion',
    language: 'en',
    tenant_id: null,
    max_documents: 10,
    urls: [
      'https://en.wikipedia.org/wiki/Sustainable_fashion',
      'https://en.wikipedia.org/wiki/Ethical_fashion',
      'https://en.wikipedia.org/wiki/Circular_economy',
      'https://en.wikipedia.org/wiki/Greenwashing',
      'https://en.wikipedia.org/wiki/Fair_trade',
    ],
  },
  odin_bootstrap_foundation_and_impact: {
    topic: 'Foundation & Impact Projects',
    domain: 'impact_investing',
    language: 'en',
    tenant_id: null,
    max_documents: 10,
    urls: [
      'https://en.wikipedia.org/wiki/Impact_investing',
      'https://en.wikipedia.org/wiki/Social_enterprise',
      'https://en.wikipedia.org/wiki/Corporate_social_responsibility',
      'https://en.wikipedia.org/wiki/Sustainable_Development_Goals',
      'https://en.wikipedia.org/wiki/Carbon_offset',
    ],
  },
};

/**
 * Run an ODIN ingestion job (batch ingestion)
 */
export async function runOdinIngestionJob(
  supabase: SupabaseClient,
  env: Bindings,
  input: OdinIngestionJobInput
): Promise<OdinIngestionJobResult> {
  const startTime = Date.now();
  const jobName = `odin_ingestion_${input.topic.toLowerCase().replace(/\s+/g, '_')}`;
  const maxDocuments = Math.min(input.max_documents || 10, 20);

  logMetricEvent({
    category: 'odin_ingestion',
    name: 'job_start',
    tenant_id: input.tenant_id || undefined,
    success: true,
    metadata: {
      job_name: jobName,
      topic: input.topic,
      domain: input.domain,
      max_documents: maxDocuments,
      url_count: input.urls?.length || 0,
    },
  });

  const result: OdinIngestionJobResult = {
    job_name: jobName,
    topic: input.topic,
    domain: input.domain,
    documents_ingested: 0,
    documents_failed: 0,
    document_ids: [],
    errors: [],
    duration_ms: 0,
  };

  const urls = input.urls || [];

  for (const url of urls.slice(0, maxDocuments)) {
    const ingestResult = await ingestKnowledgeFromUrl(supabase, env, {
      url,
      domain: input.domain,
      language: input.language || 'en',
      tenant_id: input.tenant_id ?? null,
      initiated_by_agent: 'ODIN',
      tags: [input.topic.toLowerCase().replace(/\s+/g, '-')],
    });

    if (ingestResult.success && ingestResult.document_id) {
      result.documents_ingested++;
      result.document_ids.push(ingestResult.document_id);
    } else {
      result.documents_failed++;
      result.errors.push({
        url,
        error: ingestResult.error_message || 'Unknown error',
      });
    }
  }

  result.duration_ms = Date.now() - startTime;

  logMetricEvent({
    category: 'odin_ingestion',
    name: 'job_complete',
    tenant_id: input.tenant_id || undefined,
    duration_ms: result.duration_ms,
    success: true,
    metadata: {
      job_name: jobName,
      topic: input.topic,
      domain: input.domain,
      documents_ingested: result.documents_ingested,
      documents_failed: result.documents_failed,
    },
  });

  return result;
}

/**
 * Get list of available bootstrap job names
 */
export function getBootstrapJobNames(): string[] {
  return Object.keys(ODIN_BOOTSTRAP_JOBS);
}

/**
 * Run a named bootstrap job
 */
export async function runBootstrapJob(
  supabase: SupabaseClient,
  env: Bindings,
  jobName: string
): Promise<OdinIngestionJobResult> {
  const jobConfig = ODIN_BOOTSTRAP_JOBS[jobName];

  if (!jobConfig) {
    throw new Error(`Unknown bootstrap job: ${jobName}. Available: ${getBootstrapJobNames().join(', ')}`);
  }

  return runOdinIngestionJob(supabase, env, jobConfig);
}
