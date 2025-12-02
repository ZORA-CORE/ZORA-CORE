'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
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

const CONTENT_TYPE_ICONS: Record<AcademyContentType, string> = {
  video: '🎬',
  article: '📄',
  quiz: '❓',
  interactive: '🎮',
  podcast: '🎧',
};

const DIFFICULTY_COLORS: Record<AcademyDifficultyLevel, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

type TabType = 'lessons' | 'modules' | 'paths';

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

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-purple-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CONTENT_TYPE_ICONS[lesson.content_type]}</span>
          <h3 className="font-medium text-[var(--foreground)]">{lesson.title}</h3>
        </div>
        {lesson.difficulty_level && (
          <span
            className={`text-xs px-2 py-1 rounded border ${DIFFICULTY_COLORS[lesson.difficulty_level]}`}
          >
            {lesson.difficulty_level}
          </span>
        )}
      </div>
      {lesson.subtitle && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2">{lesson.subtitle}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--foreground)]/40">
          {lesson.duration_minutes_estimated
            ? `${lesson.duration_minutes_estimated} min`
            : lesson.content_type}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--foreground)]/40">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2 h-1 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      {lesson.tags && lesson.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lesson.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
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
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-purple-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{module.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
          {module.code}
        </span>
      </div>
      {module.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {module.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--foreground)]/40">
          {module.estimated_duration_minutes
            ? `${module.estimated_duration_minutes} min`
            : 'Self-paced'}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--foreground)]/40">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2 h-1 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
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
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-purple-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{path.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
          {path.code}
        </span>
      </div>
      {path.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {path.description}
        </p>
      )}
      {path.target_audience && (
        <p className="text-xs text-[var(--foreground)]/50 mb-2">
          For: {path.target_audience}
        </p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--foreground)]/40">
          {path.estimated_duration_minutes
            ? `${Math.round(path.estimated_duration_minutes / 60)} hours`
            : 'Self-paced'}
        </span>
        {isCompleted ? (
          <span className="text-emerald-400">Completed</span>
        ) : isInProgress ? (
          <span className="text-amber-400">{progressPercent}% complete</span>
        ) : (
          <span className="text-[var(--foreground)]/40">Not started</span>
        )}
      </div>
      {isInProgress && (
        <div className="mt-2 h-1 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function AcademyPage() {
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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const completedLessons = progress.filter(
    (p) => p.entity_type === 'lesson' && p.status === 'completed'
  ).length;
  const completedModules = progress.filter(
    (p) => p.entity_type === 'module' && p.status === 'completed'
  ).length;
  const completedPaths = progress.filter(
    (p) => p.entity_type === 'learning_path' && p.status === 'completed'
  ).length;
  const inProgressCount = progress.filter((p) => p.status === 'in_progress').length;

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Climate Academy</h1>
            <p className="text-[var(--foreground)]/60">
              Learn about climate science, sustainability, and take meaningful action
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-300 hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{lessons.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Lessons</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-purple-400">{completedLessons}</div>
              <div className="text-xs text-[var(--foreground)]/50">Completed</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-amber-400">{inProgressCount}</div>
              <div className="text-xs text-[var(--foreground)]/50">In Progress</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{learningPaths.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Learning Paths</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="md">
                <div className="flex items-center gap-4 mb-4 border-b border-[var(--card-border)] pb-4">
                  <button
                    onClick={() => setActiveTab('lessons')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'lessons'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Lessons ({lessons.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'modules'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Modules ({modules.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('paths')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'paths'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Learning Paths ({learningPaths.length})
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {activeTab === 'lessons' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {lessons.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No lessons available yet.</p>
                            <p className="text-sm mt-1">
                              Ask ODIN to recommend a learning path for you.
                            </p>
                          </div>
                        ) : (
                          lessons.map((lesson) => (
                            <LessonCard
                              key={lesson.id}
                              lesson={lesson}
                              progress={getProgressForEntity('lesson', lesson.id)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'modules' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {modules.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No modules available yet.</p>
                            <p className="text-sm mt-1">
                              Modules group related lessons together.
                            </p>
                          </div>
                        ) : (
                          modules.map((module) => (
                            <ModuleCard
                              key={module.id}
                              module={module}
                              progress={getProgressForEntity('module', module.id)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'paths' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {learningPaths.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No learning paths available yet.</p>
                            <p className="text-sm mt-1">
                              Ask ODIN to build a personalized learning path for you.
                            </p>
                          </div>
                        ) : (
                          learningPaths.map((path) => (
                            <LearningPathCard
                              key={path.id}
                              path={path}
                              progress={getProgressForEntity('learning_path', path.id)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card variant="bordered" padding="md">
                <h3 className="font-semibold text-[var(--foreground)] mb-3">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Lessons Completed</span>
                    <span className="font-medium text-purple-400">
                      {completedLessons} / {lessons.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Modules Completed</span>
                    <span className="font-medium text-purple-400">
                      {completedModules} / {modules.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Paths Completed</span>
                    <span className="font-medium text-emerald-400">
                      {completedPaths} / {learningPaths.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">In Progress</span>
                    <span className="font-medium text-amber-400">{inProgressCount}</span>
                  </div>
                </div>
              </Card>

              <AgentPanel
                context="academy"
                title="Ask ODIN"
                description="Nordic agent for climate learning recommendations"
                onSuggestionSelect={handleSuggestionSelect}
              />

              <Button href="/dashboard" variant="outline" className="w-full">
                Back to Desk
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
