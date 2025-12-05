'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import {
  ZCard,
  ZButton,
  ZMetricTile,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
  ZTabs,
  ZProgress,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
import {
  getAcademyLessons,
  getAcademyModules,
  getAcademyLearningPaths,
  getAcademyProgress,
} from '@/lib/api';
import type {
  AcademyLesson,
  AcademyModule,
  AcademyLearningPath,
  AcademyUserProgress,
  AcademyContentType,
  AcademyDifficultyLevel,
  AgentPanelSuggestion,
} from '@/lib/types';

type TabType = 'lessons' | 'modules' | 'paths';

const CONTENT_TYPE_ICONS: Record<AcademyContentType, string> = {
  video: '🎬',
  article: '📄',
  quiz: '❓',
  interactive: '🎮',
  podcast: '🎧',
};

function LessonCard({
  lesson,
  progress,
}: {
  lesson: AcademyLesson;
  progress?: AcademyUserProgress;
}) {
  const progressPercent = progress?.progress_percent || 0;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';

  const difficultyVariants: Record<AcademyDifficultyLevel, 'success' | 'warning' | 'error'> = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'error',
  };

  return (
    <ZCard className="p-4 hover:border-[var(--z-violet)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CONTENT_TYPE_ICONS[lesson.content_type]}</span>
          <h3 className="font-medium text-[var(--z-text-primary)]">{lesson.title}</h3>
        </div>
        {lesson.difficulty_level && (
          <ZBadge variant={difficultyVariants[lesson.difficulty_level]} size="sm">
            {lesson.difficulty_level}
          </ZBadge>
        )}
      </div>
      {lesson.subtitle && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2">{lesson.subtitle}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--z-text-muted)]">
          {lesson.duration_minutes_estimated ? `${lesson.duration_minutes_estimated} min` : lesson.content_type}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--z-text-muted)]">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2">
          <ZProgress value={progressPercent} max={100} variant="default" size="sm" />
        </div>
      )}
      {lesson.tags && lesson.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lesson.tags.slice(0, 3).map((tag) => (
            <ZBadge key={tag} variant="odin" size="sm">{tag}</ZBadge>
          ))}
        </div>
      )}
    </ZCard>
  );
}

function ModuleCard({
  module,
  progress,
}: {
  module: AcademyModule;
  progress?: AcademyUserProgress;
}) {
  const progressPercent = progress?.progress_percent || 0;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';

  return (
    <ZCard className="p-4 hover:border-[var(--z-violet)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{module.title}</h3>
        <ZBadge variant="odin" size="sm">{module.code}</ZBadge>
      </div>
      {module.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{module.description}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--z-text-muted)]">
          {module.estimated_duration_minutes ? `${module.estimated_duration_minutes} min` : 'Self-paced'}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--z-text-muted)]">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2">
          <ZProgress value={progressPercent} max={100} variant="default" size="sm" />
        </div>
      )}
    </ZCard>
  );
}

function LearningPathCard({
  path,
  progress,
}: {
  path: AcademyLearningPath;
  progress?: AcademyUserProgress;
}) {
  const progressPercent = progress?.progress_percent || 0;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';

  return (
    <ZCard className="p-4 hover:border-[var(--z-violet)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{path.title}</h3>
        <ZBadge variant="odin" size="sm">{path.code}</ZBadge>
      </div>
      {path.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{path.description}</p>
      )}
      {path.target_audience && (
        <p className="text-xs text-[var(--z-text-muted)] mb-2">For: {path.target_audience}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--z-text-muted)]">
          {path.estimated_duration_minutes ? `${Math.round(path.estimated_duration_minutes / 60)} hours` : 'Self-paced'}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--z-text-muted)]">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2">
          <ZProgress value={progressPercent} max={100} variant="default" size="sm" />
        </div>
      )}
    </ZCard>
  );
}

export default function AcademyPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('lessons');
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [learningPaths, setLearningPaths] = useState<AcademyLearningPath[]>([]);
  const [progress, setProgress] = useState<AcademyUserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lessonsRes, modulesRes, pathsRes, progressRes] = await Promise.all([
        getAcademyLessons(),
        getAcademyModules(),
        getAcademyLearningPaths(),
        getAcademyProgress(),
      ]);
      setLessons(lessonsRes.data);
      setModules(modulesRes.data);
      setLearningPaths(pathsRes.data);
      setProgress(progressRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load academy data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const getProgressForEntity = (entityType: string, entityId: string) => {
    return progress.find((p) => p.entity_type === entityType && p.entity_id === entityId);
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'learning_path') {
      setActiveTab('paths');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const completedLessons = progress.filter((p) => p.entity_type === 'lesson' && p.status === 'completed').length;
  const completedModules = progress.filter((p) => p.entity_type === 'module' && p.status === 'completed').length;
  const completedPaths = progress.filter((p) => p.entity_type === 'learning_path' && p.status === 'completed').length;
  const inProgressCount = progress.filter((p) => p.status === 'in_progress').length;

  const tabs = [
    { id: 'lessons', label: `Lessons (${lessons.length})` },
    { id: 'modules', label: `Modules (${modules.length})` },
    { id: 'paths', label: `Learning Paths (${learningPaths.length})` },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== HERO SECTION ===== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)] mb-8">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--z-violet)] blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--z-sky)] blur-3xl" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--z-violet)] via-[var(--z-sky)] to-[var(--z-emerald)]" />
            
            <div className="relative p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--z-violet)]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--z-violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <ZBadge variant="odin" size="md">Climate Academy</ZBadge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--z-text-primary)] tracking-tight mb-2">
                    {t('academy.title', 'Climate Academy')}
                  </h1>
                  <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl">
                    {t('academy.subtitle', 'Learn about climate science, sustainability, and take meaningful action.')}
                  </p>
                </div>
                
                {/* Progress Summary */}
                <div className="flex flex-col items-start lg:items-end gap-3">
                  <div className="px-5 py-4 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
                    <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-2">Your Progress</p>
                    <div className="text-2xl font-bold text-[var(--z-violet)]">
                      {completedLessons} / {lessons.length}
                    </div>
                    <p className="text-xs text-[var(--z-text-muted)]">lessons completed</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--z-violet)] animate-pulse" />
                  <span className="text-sm text-[var(--z-text-secondary)]">{inProgressCount} in progress</span>
                </div>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">{learningPaths.length} learning paths</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <ZMetricTile label="Total Lessons" value={lessons.length} sublabel="available" onClick={() => handleTabChange('lessons')} />
            <ZMetricTile label="Completed" value={completedLessons} sublabel="lessons done" variant="violet" onClick={() => handleTabChange('lessons')} />
            <ZMetricTile label="In Progress" value={inProgressCount} sublabel="active now" variant="amber" />
            <ZMetricTile label="Learning Paths" value={learningPaths.length} sublabel="available" variant="emerald" onClick={() => handleTabChange('paths')} />
          </div>

          {isLoading ? (
            <ZLoadingState message="Loading academy data..." />
          ) : error ? (
            <ZErrorState message={error} onRetry={loadData} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ZCard className="p-4">
                  <ZTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mb-4" />

                  {activeTab === 'lessons' && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {lessons.length === 0 ? (
                        <ZEmptyState title="No lessons available" description="Ask ODIN to recommend a learning path for you." />
                      ) : (
                        lessons.map((lesson) => (
                          <LessonCard key={lesson.id} lesson={lesson} progress={getProgressForEntity('lesson', lesson.id)} />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'modules' && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {modules.length === 0 ? (
                        <ZEmptyState title="No modules available" description="Modules group related lessons together." />
                      ) : (
                        modules.map((module) => (
                          <ModuleCard key={module.id} module={module} progress={getProgressForEntity('module', module.id)} />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'paths' && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {learningPaths.length === 0 ? (
                        <ZEmptyState title="No learning paths available" description="Ask ODIN to build a personalized learning path for you." />
                      ) : (
                        learningPaths.map((path) => (
                          <LearningPathCard key={path.id} path={path} progress={getProgressForEntity('learning_path', path.id)} />
                        ))
                      )}
                    </div>
                  )}
                </ZCard>
              </div>

              <div className="space-y-6">
                <ZCard className="p-4">
                  <ZSectionHeader title="Your Progress" className="mb-3" />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--z-text-muted)]">Lessons Completed</span>
                      <span className="font-medium text-[var(--z-violet)]">{completedLessons} / {lessons.length}</span>
                    </div>
                    {lessons.length > 0 && (
                      <ZProgress value={completedLessons} max={lessons.length} variant="default" size="sm" />
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--z-text-muted)]">Modules Completed</span>
                      <span className="font-medium text-[var(--z-violet)]">{completedModules} / {modules.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--z-text-muted)]">Paths Completed</span>
                      <span className="font-medium text-emerald-400">{completedPaths} / {learningPaths.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--z-text-muted)]">In Progress</span>
                      <span className="font-medium text-amber-400">{inProgressCount}</span>
                    </div>
                  </div>
                </ZCard>

                <AgentPanel
                  context="academy"
                  title="Ask ODIN"
                  description="Nordic agent for climate learning recommendations"
                  onSuggestionSelect={handleSuggestionSelect}
                />

                <ZCard className="p-4">
                  <ZSectionHeader title="Quick Actions" className="mb-3" />
                  <div className="space-y-2">
                    <ZButton variant="secondary" className="w-full justify-start" href="/climate">Climate OS</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/foundation">Impact OS</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/dashboard">Back to Desk</ZButton>
                  </div>
                </ZCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
