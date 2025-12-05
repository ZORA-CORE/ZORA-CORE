'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { ZCard, ZButton, ZTag } from '@/components/z';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthError } from '@/lib/auth';
import { useI18n } from '@/lib/I18nProvider';

export default function LoginPage() {
  const router = useRouter();
  const { loginEmail, login, isAuthenticated, isLoading, user } = useAuth();
  const { t } = useI18n();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const [legacyToken, setLegacyToken] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSuccess) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, showSuccess]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email.trim()) {
      setError('Please enter your email');
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError('Please enter your password');
      setIsSubmitting(false);
      return;
    }

    try {
      await loginEmail({ email: email.trim(), password });
      setShowSuccess(true);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'Login failed. Please check your credentials.');
    }
    
    setIsSubmitting(false);
  };

  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const trimmedToken = legacyToken.trim();
    
    if (!trimmedToken) {
      setError('Please enter a JWT token');
      setIsSubmitting(false);
      return;
    }

    const parts = trimmedToken.split('.');
    if (parts.length !== 3) {
      setError('Invalid token format. JWT tokens have 3 parts separated by dots.');
      setIsSubmitting(false);
      return;
    }

    const success = login(trimmedToken);
    
    if (success) {
      setShowSuccess(true);
    } else {
      setError('Invalid or expired token. Please check your token and try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (showSuccess && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--z-bg-deep)] via-[var(--z-bg-base)] to-[var(--z-bg-surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold">
                <span className="text-[var(--z-emerald)]">ZORA</span>{' '}
                <span className="text-[var(--z-text-primary)]">CORE</span>
              </h1>
            </Link>
            <h2 className="mt-4 text-xl text-[var(--z-emerald)]">
              {t('auth.loginSuccess', 'Login Successful')}
            </h2>
          </div>

          <ZCard variant="elevated" padding="lg">
            <h3 className="text-sm font-medium text-[var(--z-text-primary)] mb-4">{t('auth.welcomeBack', 'Welcome back!')}</h3>
            <div className="space-y-3 text-sm">
              {user.email && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--z-text-tertiary)]">{t('auth.email', 'Email')}:</span>
                  <span className="text-[var(--z-text-primary)]">{user.email}</span>
                </div>
              )}
              {user.display_name && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--z-text-tertiary)]">{t('auth.name', 'Name')}:</span>
                  <span className="text-[var(--z-text-primary)]">{user.display_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[var(--z-text-tertiary)]">{t('auth.role', 'Role')}:</span>
                <ZTag variant={
                  user.role === 'founder' ? 'violet' :
                  user.role === 'brand_admin' ? 'emerald' : 'default'
                }>
                  {user.role}
                </ZTag>
              </div>
            </div>
          </ZCard>

          <div className="space-y-3">
            <ZButton onClick={handleContinue} variant="primary" fullWidth>
              {t('auth.continueToDashboard', 'Continue to Dashboard')}
            </ZButton>
            
            <div className="grid grid-cols-3 gap-2">
              <Link href="/climate">
                <ZButton variant="outline" size="sm" fullWidth>
                  Climate OS
                </ZButton>
              </Link>
              <Link href="/agents">
                <ZButton variant="outline" size="sm" fullWidth>
                  Agents
                </ZButton>
              </Link>
              <Link href="/journal">
                <ZButton variant="outline" size="sm" fullWidth>
                  Journal
                </ZButton>
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-[var(--z-text-muted)]">
            <p>{t('brand.tagline', 'ZORA CORE - Multi-agent, climate-first AI operating system')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--z-bg-deep)] via-[var(--z-bg-base)] to-[var(--z-bg-surface)] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--z-emerald)] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--z-violet)] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[var(--primary)] blur-3xl" />
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--z-emerald)] to-[var(--primary)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-xl">Z</span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-[var(--z-emerald)] to-[var(--primary)] bg-clip-text text-transparent">ZORA</span>{' '}
              <span className="text-[var(--z-text-primary)]">CORE</span>
            </h1>
          </Link>
          <p className="mt-3 text-sm text-[var(--z-text-tertiary)]">
            {t('brand.tagline', 'Nordic Climate OS - Multi-agent AI for climate action')}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--z-bg-elevated)] border border-[var(--z-border-default)]">
            <div className="w-2 h-2 rounded-full bg-[var(--z-emerald)] animate-pulse" />
            <span className="text-sm text-[var(--z-text-secondary)]">{t('auth.signIn', 'Sign in to your account')}</span>
          </div>
        </div>

        <ZCard variant="elevated" padding="lg">
          {!showLegacyLogin ? (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--z-text-primary)]">
                  {t('auth.email', 'Email')}
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--z-text-primary)]">
                  {t('auth.password', 'Password')}
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                    placeholder={t('auth.enterPassword', 'Enter your password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-[var(--z-radius-md)] bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[var(--z-rose)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-[var(--z-rose)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <ZButton
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                fullWidth
              >
                {isSubmitting ? t('auth.signingIn', 'Signing in...') : t('auth.signIn', 'Sign in')}
              </ZButton>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleLegacyLogin}>
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-[var(--z-text-primary)]">
                  JWT Token
                </label>
                <div className="mt-2">
                  <textarea
                    id="token"
                    name="token"
                    rows={5}
                    className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent font-mono text-sm transition-all"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={legacyToken}
                    onChange={(e) => setLegacyToken(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--z-text-muted)]">
                  Get a token from{' '}
                  <Link href="/admin/setup" className="text-[var(--z-emerald)] hover:underline">
                    Admin Setup
                  </Link>
                </p>
              </div>

              {error && (
                <div className="rounded-[var(--z-radius-md)] bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[var(--z-rose)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-[var(--z-rose)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <ZButton
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                fullWidth
              >
                {isSubmitting ? 'Signing in...' : 'Sign in with Token'}
              </ZButton>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setShowLegacyLogin(!showLegacyLogin);
                setError(null);
              }}
              className="text-sm text-[var(--z-text-tertiary)] hover:text-[var(--z-emerald)] transition-colors"
            >
              {showLegacyLogin ? 'Use email login instead' : 'Use JWT token login (legacy)'}
            </button>
          </div>
        </ZCard>

        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--z-text-tertiary)]">
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link href="/signup" className="text-[var(--z-emerald)] hover:underline">
              {t('auth.signUp', 'Sign up')}
            </Link>
          </p>
          <Link href="/mashups" className="text-sm text-[var(--z-text-tertiary)] hover:text-[var(--z-emerald)] block transition-colors">
            {t('auth.browsePublic', 'Browse public mashups without signing in')}
          </Link>
        </div>

        <div className="text-center text-xs text-[var(--z-text-muted)]">
          <p>{t('brand.tagline', 'ZORA CORE - Multi-agent, climate-first AI operating system')}</p>
        </div>
      </div>
    </div>
  );
}
