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
      router.push('/login');
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
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ZPageHeader
            title={t('academy.title', 'Climate Academy')}
            subtitle={t('academy.subtitle', 'Learn about climate science, sustainability, and take meaningful action')}
            className="mb-6"
          />

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
