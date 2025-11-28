'use client';

import { useEffect, useState } from 'react';
import { getStatus } from '@/lib/api';
import type { StatusResponse } from '@/lib/types';

// Frontend version info - injected at build time via env vars
const FRONTEND_GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local-dev';
const FRONTEND_BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';
const FRONTEND_ITERATION = '0016';

interface VersionInfoProps {
  showDetailed?: boolean;
  className?: string;
}

export function VersionInfo({ showDetailed = false, className = '' }: VersionInfoProps) {
  const [apiStatus, setApiStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await getStatus();
        setApiStatus(status);
        setError(null);
      } catch (err) {
        console.error('Failed to load API status:', err);
        setError('API unavailable');
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const formatCommit = (commit: string) => {
    if (commit === 'unknown' || commit === 'local-dev') return commit;
    return commit.substring(0, 7);
  };

  const formatBuildTime = (time: string) => {
    if (!time) return '';
    try {
      const date = new Date(time);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return time;
    }
  };

  if (showDetailed) {
    return (
      <div className={`text-sm ${className}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Frontend</h4>
            <div className="space-y-1 text-gray-400">
              <p>Iteration: <span className="text-white">{FRONTEND_ITERATION}</span></p>
              <p>Commit: <span className="font-mono text-white">{formatCommit(FRONTEND_GIT_COMMIT)}</span></p>
              {FRONTEND_BUILD_TIME && (
                <p>Built: <span className="text-white">{formatBuildTime(FRONTEND_BUILD_TIME)}</span></p>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-300 mb-2">API</h4>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : apiStatus ? (
              <div className="space-y-1 text-gray-400">
                <p>Version: <span className="text-white">{apiStatus.api_version}</span></p>
                <p>Iteration: <span className="text-white">{apiStatus.iteration}</span></p>
                <p>Commit: <span className="font-mono text-white">{formatCommit(apiStatus.git_commit)}</span></p>
                <p>Environment: <span className="text-white">{apiStatus.environment}</span></p>
                <p>Supabase: <span className={apiStatus.supabase.connected ? 'text-emerald-400' : 'text-red-400'}>
                  {apiStatus.supabase.connected ? 'Connected' : 'Disconnected'}
                </span></p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Compact version for footer
  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <span>Frontend: {formatCommit(FRONTEND_GIT_COMMIT)}</span>
      <span className="mx-2">·</span>
      {loading ? (
        <span>API: loading...</span>
      ) : error ? (
        <span className="text-red-400">API: {error}</span>
      ) : apiStatus ? (
        <>
          <span>API: {formatCommit(apiStatus.git_commit)}</span>
          <span className="mx-2">·</span>
          <span>Iteration {apiStatus.iteration}</span>
        </>
      ) : null}
    </div>
  );
}

export default VersionInfo;
