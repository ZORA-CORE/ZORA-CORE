'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { ZCard, ZButton, ZTag } from '@/components/z';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthError } from '@/lib/auth';
import { useI18n } from '@/lib/I18nProvider';

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, user } = useAuth();
  const { t } = useI18n();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect authenticated users away from signup page
  // CRITICAL: Only redirect when auth state is fully loaded to prevent redirect loops
  useEffect(() => {
    // Don't redirect while auth state is loading
    if (isLoading) {
      return;
    }
    // Don't redirect if showing success screen (user just signed up)
    if (showSuccess) {
      return;
    }
    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router, showSuccess]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email.trim()) {
      setError("Please enter your email");
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError("Please enter a password");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || "Registration failed. Please try again.");
    }
    
    setIsSubmitting(false);
  };

    const handleContinue = () => {
      router.replace("/dashboard");
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
                <span className="text-[var(--z-emerald)]">ZORA</span>{" "}
                <span className="text-[var(--z-text-primary)]">CORE</span>
              </h1>
            </Link>
            <h2 className="mt-4 text-xl text-[var(--z-emerald)]">
              {t('auth.accountCreated', 'Account Created Successfully')}
            </h2>
          </div>

          <ZCard variant="elevated" padding="lg">
            <h3 className="text-sm font-medium text-[var(--z-text-primary)] mb-4">{t('auth.welcomeToZora', 'Welcome to ZORA CORE!')}</h3>
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
                  user.role === "founder" ? "violet" :
                  user.role === "brand_admin" ? "emerald" : "default"
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
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--z-violet)] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--z-emerald)] blur-3xl" />
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
              <span className="bg-gradient-to-r from-[var(--z-emerald)] to-[var(--primary)] bg-clip-text text-transparent">ZORA</span>{" "}
              <span className="text-[var(--z-text-primary)]">CORE</span>
            </h1>
          </Link>
          <p className="mt-3 text-sm text-[var(--z-text-tertiary)]">
            {t('brand.tagline', 'Nordic Climate OS - Multi-agent AI for climate action')}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--z-bg-elevated)] border border-[var(--z-border-default)]">
            <div className="w-2 h-2 rounded-full bg-[var(--z-violet)] animate-pulse" />
            <span className="text-sm text-[var(--z-text-secondary)]">{t('auth.createAccount', 'Create your account')}</span>
          </div>
        </div>

        <ZCard variant="elevated" padding="lg">
          <form className="space-y-5" onSubmit={handleSignup}>
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
                  required
                  className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[var(--z-text-primary)]">
                {t('auth.displayName', 'Display Name')} <span className="text-[var(--z-text-muted)]">({t('common.optional', 'optional')})</span>
              </label>
              <div className="mt-2">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                  placeholder={t('auth.yourName', 'Your name')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                  placeholder={t('auth.atLeast8Chars', 'At least 8 characters')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--z-text-primary)]">
                {t('auth.confirmPassword', 'Confirm Password')}
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
                  placeholder={t('auth.confirmYourPassword', 'Confirm your password')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-[var(--z-radius-md)] bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] p-4">
                <p className="text-sm text-[var(--z-rose)]">{error}</p>
              </div>
            )}

            <ZButton
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              fullWidth
            >
              {isSubmitting ? t('auth.creatingAccount', 'Creating account...') : t('auth.createAccount', 'Create account')}
            </ZButton>
          </form>
        </ZCard>

        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--z-text-tertiary)]">
            {t('auth.haveAccount', 'Already have an account?')}{" "}
            <Link href="/login" className="text-[var(--z-emerald)] hover:underline">
              {t('auth.signIn', 'Sign in')}
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-[var(--z-text-muted)]">
          <p>{t('brand.tagline', 'ZORA CORE - Multi-agent, climate-first AI operating system')}</p>
        </div>
      </div>
    </div>
  );
}

