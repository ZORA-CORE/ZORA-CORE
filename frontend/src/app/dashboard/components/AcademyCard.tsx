'use client';

import { ZCard, ZButton, ZTag } from '@/components/z';
import { AcademicCapIcon } from './icons';
import { useI18n } from '@/lib/I18nProvider';

interface AcademyStats {
  topics_count: number;
  lessons_count: number;
  learning_paths_count: number;
  enrollments_count: number;
}

interface AcademyCardProps {
  stats: AcademyStats;
}

export function AcademyCard({ stats }: AcademyCardProps) {
  const { t } = useI18n();
  const hasEnrollments = stats.enrollments_count > 0;

  return (
    <ZCard variant="default" padding="md" accent="amber" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-amber-soft)]">
          <span className="text-[var(--z-amber)]"><AcademicCapIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('academy.title', 'Climate Academy')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('academy.subtitle', 'Learn about climate action')}</p>
        </div>
        {hasEnrollments && (
          <ZTag variant="amber" size="sm">Enrolled</ZTag>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {hasEnrollments ? (
          <>
            <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-lg)] p-4 border border-[var(--z-border-subtle)]">
              <p className="text-sm text-[var(--z-text-tertiary)] mb-1">Your Enrollments</p>
              <p className="text-2xl font-bold text-[var(--z-text-primary)]">{stats.enrollments_count}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('academy.lessons', 'Available Lessons')}</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.lessons_count}</p>
              </div>
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('academy.learningPaths', 'Learning Paths')}</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.learning_paths_count}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('academy.topics', 'Topics')}</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.topics_count}</p>
              </div>
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('academy.lessons', 'Lessons')}</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.lessons_count}</p>
              </div>
            </div>

            <div className="bg-[var(--z-amber-soft)] border border-[var(--z-amber-border)] rounded-[var(--z-radius-md)] p-3">
              <p className="text-sm text-[var(--z-text-secondary)]">
                Expand your climate knowledge. Explore topics from carbon footprints to renewable energy.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)]">
        <ZButton href="/academy" variant="primary" size="sm" fullWidth>
          {hasEnrollments ? 'Continue Learning' : 'Start Learning'}
        </ZButton>
      </div>
    </ZCard>
  );
}

export default AcademyCard;
