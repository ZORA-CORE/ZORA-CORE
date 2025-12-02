'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AcademicCapIcon } from './icons';

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
  const hasEnrollments = stats.enrollments_count > 0;

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500/10">
          <span className="text-amber-500"><AcademicCapIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Climate Learning</h3>
          <p className="text-sm text-[var(--foreground)]/60">ZORA ACADEMY</p>
        </div>
        {hasEnrollments && (
          <span className="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full">
            Enrolled
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {hasEnrollments ? (
          <>
            <div className="bg-[var(--background)] rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)]/60 mb-1">Your Enrollments</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.enrollments_count}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Available Lessons</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.lessons_count}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Learning Paths</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.learning_paths_count}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Topics</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.topics_count}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Lessons</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.lessons_count}</p>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-[var(--foreground)]/70">
                Expand your climate knowledge. Explore topics from carbon footprints to renewable energy.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <Button href="/academy" variant="primary" size="sm" className="w-full">
          {hasEnrollments ? 'Continue Learning' : 'Start Learning'}
        </Button>
      </div>
    </Card>
  );
}

export default AcademyCard;
