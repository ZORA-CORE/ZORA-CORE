/**
 * Climate Academy API handlers for ZORA CORE
 * 
 * Provides endpoints for managing lessons, modules, learning paths, and user progress.
 * All endpoints are JWT-authenticated and tenant-aware.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId, getUserId, getAuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '../lib/response';
import type {
  AcademyLesson,
  CreateAcademyLessonInput,
  UpdateAcademyLessonInput,
  AcademyLessonFilters,
  AcademyModule,
  AcademyModuleWithLessons,
  CreateAcademyModuleInput,
  UpdateAcademyModuleInput,
  AcademyModuleFilters,
  AcademyLearningPath,
  AcademyLearningPathWithModules,
  CreateAcademyLearningPathInput,
  UpdateAcademyLearningPathInput,
  AcademyLearningPathFilters,
  AcademyUserProgress,
  UpdateAcademyProgressInput,
  AcademyProgressFilters,
} from '../types';

const academyHandler = new Hono<AuthAppEnv>();

// ============================================================================
// LESSONS ENDPOINTS
// ============================================================================

/**
 * GET /api/academy/lessons
 * List lessons for the current tenant (includes global lessons where tenant_id IS NULL)
 */
academyHandler.get('/lessons', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Parse filters from query params
    const filters: AcademyLessonFilters = {
      topic: c.req.query('topic') || undefined,
      content_type: c.req.query('content_type') || undefined,
      language: c.req.query('language') || undefined,
      difficulty_level: c.req.query('difficulty_level') || undefined,
      is_active: c.req.query('is_active') === 'true' ? true : c.req.query('is_active') === 'false' ? false : undefined,
    };
    
    // Build query - include global lessons (tenant_id IS NULL) and tenant-specific lessons
    let query = supabase
      .from('academy_lessons')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.topic) {
      query = query.eq('primary_topic_code', filters.topic);
    }
    if (filters.content_type) {
      query = query.eq('content_type', filters.content_type);
    }
    if (filters.language) {
      query = query.eq('language_code', filters.language);
    }
    if (filters.difficulty_level) {
      query = query.eq('difficulty_level', filters.difficulty_level);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    
    const { data: lessons, error } = await query;
    
    if (error) {
      console.error('Error fetching lessons:', error);
      return serverErrorResponse('Failed to fetch lessons');
    }
    
    return jsonResponse({ data: lessons || [] });
  } catch (err) {
    console.error('Error in GET /lessons:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * GET /api/academy/lessons/:id
 * Get a specific lesson by ID
 */
academyHandler.get('/lessons/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const lessonId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data: lesson, error } = await supabase
      .from('academy_lessons')
      .select('*')
      .eq('id', lessonId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (error || !lesson) {
      return notFoundResponse('Lesson');
    }
    
    return jsonResponse({ data: lesson as AcademyLesson });
  } catch (err) {
    console.error('Error in GET /lessons/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/lessons
 * Create a new lesson (tenant-specific)
 */
academyHandler.post('/lessons', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    // Check role - only founder/brand_admin can create lessons
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can create lessons');
    }
    
    let input: CreateAcademyLessonInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.title || !input.content_type || !input.source_type) {
      return badRequestResponse('title, content_type, and source_type are required');
    }
    
    const { data: lesson, error } = await supabase
      .from('academy_lessons')
      .insert({
        tenant_id: tenantId,
        title: input.title,
        subtitle: input.subtitle || null,
        description: input.description || null,
        content_type: input.content_type,
        source_type: input.source_type,
        source_url: input.source_url || null,
        duration_minutes_estimated: input.duration_minutes_estimated || null,
        language_code: input.language_code || null,
        difficulty_level: input.difficulty_level || null,
        primary_topic_code: input.primary_topic_code || null,
        tags: input.tags || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
        thumbnail_url: input.thumbnail_url || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (error || !lesson) {
      console.error('Error creating lesson:', error);
      return serverErrorResponse('Failed to create lesson');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'academy_lesson_created',
      summary: `Academy lesson "${input.title}" created`,
      category: 'system_event',
      metadata: {
        lesson_id: lesson.id,
        title: input.title,
        content_type: input.content_type,
        source_type: input.source_type,
        created_by: userId,
      },
      relatedEntityIds: [lesson.id],
    });
    
    return jsonResponse({ data: lesson as AcademyLesson }, 201);
  } catch (err) {
    console.error('Error in POST /lessons:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * PATCH /api/academy/lessons/:id
 * Update a lesson
 */
academyHandler.patch('/lessons/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const lessonId = c.req.param('id');
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    // Check role
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can update lessons');
    }
    
    // Verify lesson exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('academy_lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Lesson');
    }
    
    let input: UpdateAcademyLessonInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.content_type !== undefined) updateData.content_type = input.content_type;
    if (input.source_type !== undefined) updateData.source_type = input.source_type;
    if (input.source_url !== undefined) updateData.source_url = input.source_url;
    if (input.duration_minutes_estimated !== undefined) updateData.duration_minutes_estimated = input.duration_minutes_estimated;
    if (input.language_code !== undefined) updateData.language_code = input.language_code;
    if (input.difficulty_level !== undefined) updateData.difficulty_level = input.difficulty_level;
    if (input.primary_topic_code !== undefined) updateData.primary_topic_code = input.primary_topic_code;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    
    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }
    
    const { data: lesson, error } = await supabase
      .from('academy_lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single();
    
    if (error || !lesson) {
      console.error('Error updating lesson:', error);
      return serverErrorResponse('Failed to update lesson');
    }
    
    return jsonResponse({ data: lesson as AcademyLesson });
  } catch (err) {
    console.error('Error in PATCH /lessons/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// MODULES ENDPOINTS
// ============================================================================

/**
 * GET /api/academy/modules
 * List modules for the current tenant (includes global modules)
 */
academyHandler.get('/modules', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    const filters: AcademyModuleFilters = {
      topic: c.req.query('topic') || undefined,
      target_audience: c.req.query('target_audience') || undefined,
      is_active: c.req.query('is_active') === 'true' ? true : c.req.query('is_active') === 'false' ? false : undefined,
    };
    
    let query = supabase
      .from('academy_modules')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('created_at', { ascending: false });
    
    if (filters.topic) {
      query = query.eq('primary_topic_code', filters.topic);
    }
    if (filters.target_audience) {
      query = query.eq('target_audience', filters.target_audience);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    
    const { data: modules, error } = await query;
    
    if (error) {
      console.error('Error fetching modules:', error);
      return serverErrorResponse('Failed to fetch modules');
    }
    
    return jsonResponse({ data: modules || [] });
  } catch (err) {
    console.error('Error in GET /modules:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * GET /api/academy/modules/:id
 * Get a specific module with its lessons
 */
academyHandler.get('/modules/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const moduleId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // Get module
    const { data: module, error: moduleError } = await supabase
      .from('academy_modules')
      .select('*')
      .eq('id', moduleId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (moduleError || !module) {
      return notFoundResponse('Module');
    }
    
    // Get module lessons with ordering
    const { data: moduleLessons, error: lessonsError } = await supabase
      .from('academy_module_lessons')
      .select('lesson_id, lesson_order, is_required')
      .eq('module_id', moduleId)
      .order('lesson_order', { ascending: true });
    
    if (lessonsError) {
      console.error('Error fetching module lessons:', lessonsError);
      return serverErrorResponse('Failed to fetch module lessons');
    }
    
    // Get full lesson details
    const lessonIds = (moduleLessons || []).map(ml => ml.lesson_id);
    let lessons: AcademyLesson[] = [];
    
    if (lessonIds.length > 0) {
      const { data: lessonData } = await supabase
        .from('academy_lessons')
        .select('*')
        .in('id', lessonIds);
      
      if (lessonData) {
        // Merge lesson data with ordering info
        lessons = (moduleLessons || []).map(ml => {
          const lesson = lessonData.find(l => l.id === ml.lesson_id);
          return lesson ? { ...lesson, lesson_order: ml.lesson_order, is_required: ml.is_required } : null;
        }).filter(Boolean) as AcademyLesson[];
      }
    }
    
    const result: AcademyModuleWithLessons = {
      ...module,
      lessons: lessons as (AcademyLesson & { lesson_order: number; is_required: boolean })[],
    };
    
    return jsonResponse({ data: result });
  } catch (err) {
    console.error('Error in GET /modules/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/modules
 * Create a new module with optional lessons
 */
academyHandler.post('/modules', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can create modules');
    }
    
    let input: CreateAcademyModuleInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.code || !input.title) {
      return badRequestResponse('code and title are required');
    }
    
    // Create module
    const { data: module, error: moduleError } = await supabase
      .from('academy_modules')
      .insert({
        tenant_id: tenantId,
        code: input.code,
        title: input.title,
        description: input.description || null,
        primary_topic_code: input.primary_topic_code || null,
        target_audience: input.target_audience || null,
        estimated_duration_minutes: input.estimated_duration_minutes || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (moduleError || !module) {
      console.error('Error creating module:', moduleError);
      return serverErrorResponse('Failed to create module');
    }
    
    // Add lessons if provided
    if (input.lessons && input.lessons.length > 0) {
      const lessonLinks = input.lessons.map(l => ({
        module_id: module.id,
        lesson_id: l.lesson_id,
        lesson_order: l.lesson_order,
        is_required: l.is_required !== undefined ? l.is_required : true,
      }));
      
      const { error: linkError } = await supabase
        .from('academy_module_lessons')
        .insert(lessonLinks);
      
      if (linkError) {
        console.error('Failed to link lessons to module:', linkError);
      }
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'academy_module_created',
      summary: `Academy module "${input.title}" created`,
      category: 'system_event',
      metadata: {
        module_id: module.id,
        code: input.code,
        title: input.title,
        lessons_count: input.lessons?.length || 0,
        created_by: userId,
      },
      relatedEntityIds: [module.id],
    });
    
    return jsonResponse({ data: module as AcademyModule }, 201);
  } catch (err) {
    console.error('Error in POST /modules:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * PATCH /api/academy/modules/:id
 * Update a module
 */
academyHandler.patch('/modules/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const moduleId = c.req.param('id');
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can update modules');
    }
    
    const { data: existing, error: fetchError } = await supabase
      .from('academy_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Module');
    }
    
    let input: UpdateAcademyModuleInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.primary_topic_code !== undefined) updateData.primary_topic_code = input.primary_topic_code;
    if (input.target_audience !== undefined) updateData.target_audience = input.target_audience;
    if (input.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = input.estimated_duration_minutes;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    
    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }
    
    const { data: module, error } = await supabase
      .from('academy_modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single();
    
    if (error || !module) {
      console.error('Error updating module:', error);
      return serverErrorResponse('Failed to update module');
    }
    
    return jsonResponse({ data: module as AcademyModule });
  } catch (err) {
    console.error('Error in PATCH /modules/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// LEARNING PATHS ENDPOINTS
// ============================================================================

/**
 * GET /api/academy/paths
 * List learning paths for the current tenant (includes global paths)
 */
academyHandler.get('/paths', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    const filters: AcademyLearningPathFilters = {
      target_audience: c.req.query('target_audience') || undefined,
      primary_topic_code: c.req.query('primary_topic_code') || undefined,
      is_active: c.req.query('is_active') === 'true' ? true : c.req.query('is_active') === 'false' ? false : undefined,
    };
    
    let query = supabase
      .from('academy_learning_paths')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('created_at', { ascending: false });
    
    if (filters.target_audience) {
      query = query.eq('target_audience', filters.target_audience);
    }
    if (filters.primary_topic_code) {
      query = query.eq('primary_topic_code', filters.primary_topic_code);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    
    const { data: paths, error } = await query;
    
    if (error) {
      console.error('Error fetching learning paths:', error);
      return serverErrorResponse('Failed to fetch learning paths');
    }
    
    return jsonResponse({ data: paths || [] });
  } catch (err) {
    console.error('Error in GET /paths:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * GET /api/academy/paths/:id
 * Get a specific learning path with its modules
 */
academyHandler.get('/paths/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const pathId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // Get learning path
    const { data: path, error: pathError } = await supabase
      .from('academy_learning_paths')
      .select('*')
      .eq('id', pathId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (pathError || !path) {
      return notFoundResponse('Learning path');
    }
    
    // Get path modules with ordering
    const { data: pathModules, error: modulesError } = await supabase
      .from('academy_learning_path_modules')
      .select('module_id, module_order')
      .eq('learning_path_id', pathId)
      .order('module_order', { ascending: true });
    
    if (modulesError) {
      console.error('Error fetching path modules:', modulesError);
      return serverErrorResponse('Failed to fetch path modules');
    }
    
    // Get full module details
    const moduleIds = (pathModules || []).map(pm => pm.module_id);
    let modules: AcademyModule[] = [];
    
    if (moduleIds.length > 0) {
      const { data: moduleData } = await supabase
        .from('academy_modules')
        .select('*')
        .in('id', moduleIds);
      
      if (moduleData) {
        modules = (pathModules || []).map(pm => {
          const module = moduleData.find(m => m.id === pm.module_id);
          return module ? { ...module, module_order: pm.module_order } : null;
        }).filter(Boolean) as AcademyModule[];
      }
    }
    
    const result: AcademyLearningPathWithModules = {
      ...path,
      modules: modules as (AcademyModule & { module_order: number })[],
    };
    
    return jsonResponse({ data: result });
  } catch (err) {
    console.error('Error in GET /paths/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/paths
 * Create a new learning path with optional modules
 */
academyHandler.post('/paths', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can create learning paths');
    }
    
    let input: CreateAcademyLearningPathInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.code || !input.title) {
      return badRequestResponse('code and title are required');
    }
    
    // Create learning path
    const { data: path, error: pathError } = await supabase
      .from('academy_learning_paths')
      .insert({
        tenant_id: tenantId,
        code: input.code,
        title: input.title,
        description: input.description || null,
        target_audience: input.target_audience || null,
        recommended_for_profile_type: input.recommended_for_profile_type || null,
        primary_topic_code: input.primary_topic_code || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (pathError || !path) {
      console.error('Error creating learning path:', pathError);
      return serverErrorResponse('Failed to create learning path');
    }
    
    // Add modules if provided
    if (input.modules && input.modules.length > 0) {
      const moduleLinks = input.modules.map(m => ({
        learning_path_id: path.id,
        module_id: m.module_id,
        module_order: m.module_order,
      }));
      
      const { error: linkError } = await supabase
        .from('academy_learning_path_modules')
        .insert(moduleLinks);
      
      if (linkError) {
        console.error('Failed to link modules to path:', linkError);
      }
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'academy_path_created',
      summary: `Academy learning path "${input.title}" created`,
      category: 'system_event',
      metadata: {
        path_id: path.id,
        code: input.code,
        title: input.title,
        modules_count: input.modules?.length || 0,
        created_by: userId,
      },
      relatedEntityIds: [path.id],
    });
    
    return jsonResponse({ data: path as AcademyLearningPath }, 201);
  } catch (err) {
    console.error('Error in POST /paths:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * PATCH /api/academy/paths/:id
 * Update a learning path
 */
academyHandler.patch('/paths/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const pathId = c.req.param('id');
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    
    if (!['founder', 'brand_admin'].includes(auth.role)) {
      return forbiddenResponse('Only founder or brand_admin can update learning paths');
    }
    
    const { data: existing, error: fetchError } = await supabase
      .from('academy_learning_paths')
      .select('*')
      .eq('id', pathId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Learning path');
    }
    
    let input: UpdateAcademyLearningPathInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.target_audience !== undefined) updateData.target_audience = input.target_audience;
    if (input.recommended_for_profile_type !== undefined) updateData.recommended_for_profile_type = input.recommended_for_profile_type;
    if (input.primary_topic_code !== undefined) updateData.primary_topic_code = input.primary_topic_code;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    
    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }
    
    const { data: path, error } = await supabase
      .from('academy_learning_paths')
      .update(updateData)
      .eq('id', pathId)
      .select()
      .single();
    
    if (error || !path) {
      console.error('Error updating learning path:', error);
      return serverErrorResponse('Failed to update learning path');
    }
    
    return jsonResponse({ data: path as AcademyLearningPath });
  } catch (err) {
    console.error('Error in PATCH /paths/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// USER PROGRESS ENDPOINTS
// ============================================================================

/**
 * GET /api/academy/progress
 * Get progress for the current user
 */
academyHandler.get('/progress', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const supabase = getSupabaseClient(c.env);
    
    const filters: AcademyProgressFilters = {
      learning_path_id: c.req.query('learning_path_id') || undefined,
      module_id: c.req.query('module_id') || undefined,
      lesson_id: c.req.query('lesson_id') || undefined,
      status: c.req.query('status') || undefined,
    };
    
    let query = supabase
      .from('academy_user_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (filters.learning_path_id) {
      query = query.eq('learning_path_id', filters.learning_path_id);
    }
    if (filters.module_id) {
      query = query.eq('module_id', filters.module_id);
    }
    if (filters.lesson_id) {
      query = query.eq('lesson_id', filters.lesson_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data: progress, error } = await query;
    
    if (error) {
      console.error('Error fetching progress:', error);
      return serverErrorResponse('Failed to fetch progress');
    }
    
    return jsonResponse({ data: progress || [] });
  } catch (err) {
    console.error('Error in GET /progress:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/progress/lessons/:lessonId
 * Mark/update progress for a lesson
 */
academyHandler.post('/progress/lessons/:lessonId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const lessonId = c.req.param('lessonId');
    const supabase = getSupabaseClient(c.env);
    
    let input: UpdateAcademyProgressInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.status) {
      return badRequestResponse('status is required');
    }
    
    // Verify lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('academy_lessons')
      .select('id, title')
      .eq('id', lessonId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (lessonError || !lesson) {
      return notFoundResponse('Lesson');
    }
    
    // Check if progress record exists
    const { data: existing } = await supabase
      .from('academy_user_progress')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();
    
    const now = new Date().toISOString();
    const progressData = {
      status: input.status,
      progress_percent: input.progress_percent || null,
      last_accessed_at: now,
      completed_at: input.status === 'completed' ? now : null,
    };
    
    let progress: AcademyUserProgress;
    
    if (existing) {
      // Update existing progress
      const { data, error } = await supabase
        .from('academy_user_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error updating progress:', error);
        return serverErrorResponse('Failed to update progress');
      }
      progress = data;
    } else {
      // Create new progress record
      const { data, error } = await supabase
        .from('academy_user_progress')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          lesson_id: lessonId,
          ...progressData,
          metadata: {},
        })
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error creating progress:', error);
        return serverErrorResponse('Failed to create progress');
      }
      progress = data;
    }
    
    // Create journal entry for completion
    if (input.status === 'completed') {
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'academy_lesson_completed',
        summary: `User completed academy lesson "${lesson.title}"`,
        category: 'user_feedback',
        metadata: {
          lesson_id: lessonId,
          user_id: userId,
          progress_percent: input.progress_percent || 100,
        },
        relatedEntityIds: [lessonId],
      });
    }
    
    return jsonResponse({ data: progress });
  } catch (err) {
    console.error('Error in POST /progress/lessons/:lessonId:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/progress/modules/:moduleId
 * Mark/update progress for a module
 */
academyHandler.post('/progress/modules/:moduleId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const moduleId = c.req.param('moduleId');
    const supabase = getSupabaseClient(c.env);
    
    let input: UpdateAcademyProgressInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.status) {
      return badRequestResponse('status is required');
    }
    
    // Verify module exists
    const { data: module, error: moduleError } = await supabase
      .from('academy_modules')
      .select('id')
      .eq('id', moduleId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (moduleError || !module) {
      return notFoundResponse('Module');
    }
    
    // Check if progress record exists
    const { data: existing } = await supabase
      .from('academy_user_progress')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();
    
    const now = new Date().toISOString();
    const progressData = {
      status: input.status,
      progress_percent: input.progress_percent || null,
      last_accessed_at: now,
      completed_at: input.status === 'completed' ? now : null,
    };
    
    let progress: AcademyUserProgress;
    
    if (existing) {
      const { data, error } = await supabase
        .from('academy_user_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error updating progress:', error);
        return serverErrorResponse('Failed to update progress');
      }
      progress = data;
    } else {
      const { data, error } = await supabase
        .from('academy_user_progress')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          module_id: moduleId,
          ...progressData,
          metadata: {},
        })
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error creating progress:', error);
        return serverErrorResponse('Failed to create progress');
      }
      progress = data;
    }
    
    return jsonResponse({ data: progress });
  } catch (err) {
    console.error('Error in POST /progress/modules/:moduleId:', err);
    return serverErrorResponse('Internal server error');
  }
});

/**
 * POST /api/academy/progress/paths/:pathId
 * Mark/update progress for a learning path
 */
academyHandler.post('/progress/paths/:pathId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const pathId = c.req.param('pathId');
    const supabase = getSupabaseClient(c.env);
    
    let input: UpdateAcademyProgressInput;
    try {
      input = await c.req.json();
    } catch {
      return badRequestResponse('Request body must be valid JSON');
    }
    
    if (!input.status) {
      return badRequestResponse('status is required');
    }
    
    // Verify path exists
    const { data: path, error: pathError } = await supabase
      .from('academy_learning_paths')
      .select('id')
      .eq('id', pathId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();
    
    if (pathError || !path) {
      return notFoundResponse('Learning path');
    }
    
    // Check if progress record exists
    const { data: existing } = await supabase
      .from('academy_user_progress')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('learning_path_id', pathId)
      .single();
    
    const now = new Date().toISOString();
    const progressData = {
      status: input.status,
      progress_percent: input.progress_percent || null,
      last_accessed_at: now,
      completed_at: input.status === 'completed' ? now : null,
    };
    
    let progress: AcademyUserProgress;
    
    if (existing) {
      const { data, error } = await supabase
        .from('academy_user_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error updating progress:', error);
        return serverErrorResponse('Failed to update progress');
      }
      progress = data;
    } else {
      const { data, error } = await supabase
        .from('academy_user_progress')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          learning_path_id: pathId,
          ...progressData,
          metadata: {},
        })
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error creating progress:', error);
        return serverErrorResponse('Failed to create progress');
      }
      progress = data;
    }
    
    return jsonResponse({ data: progress });
  } catch (err) {
    console.error('Error in POST /progress/paths/:pathId:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default academyHandler;
