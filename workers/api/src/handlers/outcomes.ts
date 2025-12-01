/**
 * Outcome Feedback API handlers for ZORA CORE
 * 
 * Outcome Feedback & Continual Learning v1.0 (Iteration 00D6)
 * 
 * These endpoints provide outcome feedback management for ZORA entities:
 * - Record feedback on missions, workflows, projects, etc.
 * - Fetch feedback for specific targets
 * - Compute basic stats per target and per type
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import type { AuthContext } from '../lib/auth';

const outcomesHandler = new Hono<AuthAppEnv>();

const VALID_TARGET_TYPES = [
  'climate_mission',
  'workflow_run',
  'zora_shop_project',
  'foundation_project',
  'goes_green_profile',
  'goes_green_action',
  'academy_learning_path',
  'academy_lesson',
];

const VALID_SOURCES = ['user', 'agent', 'system', 'admin'];

const VALID_SENTIMENTS = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'];

interface FeedbackRecord {
  id: string;
  tenant_id: string;
  user_id: string | null;
  source: string;
  target_type: string;
  target_id: string;
  rating: number | null;
  sentiment: string | null;
  tags: string[] | null;
  comment: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

interface FeedbackStats {
  target_type: string;
  target_id: string | null;
  count: number;
  avg_rating: number | null;
  sentiment_counts: Record<string, number>;
  top_tags: Array<{ tag: string; count: number }>;
  last_feedback_at: string | null;
  best_entities?: Array<{ target_id: string; avg_rating: number; feedback_count: number }>;
  worst_entities?: Array<{ target_id: string; avg_rating: number; feedback_count: number }>;
}

/**
 * POST /api/outcomes/feedback
 * Record feedback for a ZORA entity
 */
outcomesHandler.post('/feedback', async (c) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  const body = await c.req.json().catch(() => ({}));
  const {
    target_type,
    target_id,
    rating,
    sentiment,
    tags,
    comment,
    context,
    source = 'user',
  } = body;
  
  if (!target_type || !target_id) {
    return errorResponse('VALIDATION_ERROR', 'target_type and target_id are required', 400);
  }
  
  if (!VALID_TARGET_TYPES.includes(target_type)) {
    return errorResponse('VALIDATION_ERROR', `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`, 400);
  }
  
  if (!VALID_SOURCES.includes(source)) {
    return errorResponse('VALIDATION_ERROR', `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`, 400);
  }
  
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return errorResponse('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }
  
  if (sentiment && !VALID_SENTIMENTS.includes(sentiment)) {
    return errorResponse('VALIDATION_ERROR', `Invalid sentiment. Must be one of: ${VALID_SENTIMENTS.join(', ')}`, 400);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    const feedbackData: Record<string, unknown> = {
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      source,
      target_type,
      target_id,
      context: context || {},
    };
    
    if (rating !== undefined && rating !== null) {
      feedbackData.rating = rating;
    }
    if (sentiment) {
      feedbackData.sentiment = sentiment;
    }
    if (tags && Array.isArray(tags)) {
      feedbackData.tags = tags;
    }
    if (comment) {
      feedbackData.comment = comment;
    }
    
    const { data: feedback, error } = await supabase
      .from('outcome_feedback')
      .insert(feedbackData)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting feedback:', error);
      return errorResponse('DATABASE_ERROR', 'Failed to record feedback', 500);
    }
    
    // Create journal entry
    try {
      await supabase.from('journal_entries').insert({
        tenant_id: auth.tenantId,
        category: 'learning',
        event_type: 'outcome_feedback_recorded',
        title: `Feedback recorded for ${target_type}`,
        content: `New ${source} feedback recorded for ${target_type} (${target_id})`,
        metadata: {
          target_type,
          target_id,
          rating,
          source,
        },
      });
    } catch (journalError) {
      console.warn('Failed to create journal entry:', journalError);
    }
    
    return jsonResponse({ data: feedback, error: null });
  } catch (err) {
    console.error('Error recording feedback:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to record feedback', 500);
  }
});

/**
 * GET /api/outcomes/feedback
 * Get feedback for a specific target
 * 
 * Query params:
 * - target_type (required)
 * - target_id (required)
 * - limit (optional, default 50)
 * - offset (optional, default 0)
 */
outcomesHandler.get('/feedback', async (c) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  const targetType = c.req.query('target_type');
  const targetId = c.req.query('target_id');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  
  if (!targetType || !targetId) {
    return errorResponse('VALIDATION_ERROR', 'target_type and target_id are required', 400);
  }
  
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return errorResponse('VALIDATION_ERROR', `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`, 400);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    const { data: feedback, error, count } = await supabase
      .from('outcome_feedback')
      .select('*', { count: 'exact' })
      .eq('tenant_id', auth.tenantId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching feedback:', error);
      return errorResponse('DATABASE_ERROR', 'Failed to fetch feedback', 500);
    }
    
    return jsonResponse({
      data: feedback || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: offset + (feedback?.length || 0) < (count || 0),
      },
      error: null,
    });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch feedback', 500);
  }
});

/**
 * GET /api/outcomes/stats/target
 * Get stats for a specific target
 * 
 * Query params:
 * - target_type (required)
 * - target_id (required)
 */
outcomesHandler.get('/stats/target', async (c) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  const targetType = c.req.query('target_type');
  const targetId = c.req.query('target_id');
  
  if (!targetType || !targetId) {
    return errorResponse('VALIDATION_ERROR', 'target_type and target_id are required', 400);
  }
  
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return errorResponse('VALIDATION_ERROR', `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`, 400);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    const { data: feedback, error } = await supabase
      .from('outcome_feedback')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    
    if (error) {
      console.error('Error fetching feedback:', error);
      return errorResponse('DATABASE_ERROR', 'Failed to compute stats', 500);
    }
    
    const rows = feedback || [];
    
    if (rows.length === 0) {
      return jsonResponse({
        data: {
          target_type: targetType,
          target_id: targetId,
          count: 0,
          avg_rating: null,
          sentiment_counts: {},
          top_tags: [],
          last_feedback_at: null,
        } as FeedbackStats,
        error: null,
      });
    }
    
    // Compute stats
    const ratings = rows.filter(r => r.rating !== null).map(r => r.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    
    const sentimentCounts: Record<string, number> = {};
    for (const row of rows) {
      if (row.sentiment) {
        sentimentCounts[row.sentiment] = (sentimentCounts[row.sentiment] || 0) + 1;
      }
    }
    
    const tagCounts: Record<string, number> = {};
    for (const row of rows) {
      if (row.tags && Array.isArray(row.tags)) {
        for (const tag of row.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    const lastFeedbackAt = rows.reduce((max, row) => {
      return row.created_at > max ? row.created_at : max;
    }, rows[0].created_at);
    
    const stats: FeedbackStats = {
      target_type: targetType,
      target_id: targetId,
      count: rows.length,
      avg_rating: avgRating !== null ? Math.round(avgRating * 100) / 100 : null,
      sentiment_counts: sentimentCounts,
      top_tags: topTags,
      last_feedback_at: lastFeedbackAt,
    };
    
    return jsonResponse({ data: stats, error: null });
  } catch (err) {
    console.error('Error computing stats:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to compute stats', 500);
  }
});

/**
 * GET /api/outcomes/stats/type
 * Get aggregated stats for all entities of a type
 * 
 * Query params:
 * - target_type (required)
 */
outcomesHandler.get('/stats/type', async (c) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  const targetType = c.req.query('target_type');
  
  if (!targetType) {
    return errorResponse('VALIDATION_ERROR', 'target_type is required', 400);
  }
  
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return errorResponse('VALIDATION_ERROR', `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`, 400);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    const { data: feedback, error } = await supabase
      .from('outcome_feedback')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('target_type', targetType);
    
    if (error) {
      console.error('Error fetching feedback:', error);
      return errorResponse('DATABASE_ERROR', 'Failed to compute stats', 500);
    }
    
    const rows = feedback || [];
    
    if (rows.length === 0) {
      return jsonResponse({
        data: {
          target_type: targetType,
          target_id: null,
          count: 0,
          avg_rating: null,
          sentiment_counts: {},
          top_tags: [],
          last_feedback_at: null,
          best_entities: [],
          worst_entities: [],
        } as FeedbackStats,
        error: null,
      });
    }
    
    // Compute overall stats
    const ratings = rows.filter(r => r.rating !== null).map(r => r.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    
    const sentimentCounts: Record<string, number> = {};
    for (const row of rows) {
      if (row.sentiment) {
        sentimentCounts[row.sentiment] = (sentimentCounts[row.sentiment] || 0) + 1;
      }
    }
    
    const tagCounts: Record<string, number> = {};
    for (const row of rows) {
      if (row.tags && Array.isArray(row.tags)) {
        for (const tag of row.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    const lastFeedbackAt = rows.reduce((max, row) => {
      return row.created_at > max ? row.created_at : max;
    }, rows[0].created_at);
    
    // Compute per-entity stats for best/worst
    const entityStats: Record<string, { ratings: number[]; count: number }> = {};
    for (const row of rows) {
      const tid = row.target_id;
      if (!entityStats[tid]) {
        entityStats[tid] = { ratings: [], count: 0 };
      }
      entityStats[tid].count += 1;
      if (row.rating !== null) {
        entityStats[tid].ratings.push(row.rating);
      }
    }
    
    const entityAvgs = Object.entries(entityStats)
      .filter(([_, stats]) => stats.ratings.length > 0)
      .map(([targetId, stats]) => ({
        target_id: targetId,
        avg_rating: Math.round((stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length) * 100) / 100,
        feedback_count: stats.count,
      }));
    
    const bestEntities = [...entityAvgs]
      .sort((a, b) => b.avg_rating - a.avg_rating)
      .slice(0, 5);
    
    const worstEntities = [...entityAvgs]
      .sort((a, b) => a.avg_rating - b.avg_rating)
      .slice(0, 5);
    
    const stats: FeedbackStats = {
      target_type: targetType,
      target_id: null,
      count: rows.length,
      avg_rating: avgRating !== null ? Math.round(avgRating * 100) / 100 : null,
      sentiment_counts: sentimentCounts,
      top_tags: topTags,
      last_feedback_at: lastFeedbackAt,
      best_entities: bestEntities,
      worst_entities: worstEntities,
    };
    
    return jsonResponse({ data: stats, error: null });
  } catch (err) {
    console.error('Error computing stats:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to compute stats', 500);
  }
});

export default outcomesHandler;
