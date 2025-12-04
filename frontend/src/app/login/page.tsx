'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthError } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { loginEmail, login, isAuthenticated, isLoading, user } = useAuth();
  
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold">
                <span className="text-[var(--primary)]">ZORA</span>{' '}
                <span className="text-[var(--foreground)]">CORE</span>
              </h1>
            </Link>
            <h2 className="mt-4 text-xl text-[var(--primary)]">
              Login Successful
            </h2>
          </div>

          <Card variant="default" padding="lg">
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-4">Welcome back!</h3>
            <div className="space-y-3 text-sm">
              {user.email && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--foreground)]/60">Email:</span>
                  <span className="text-[var(--foreground)]">{user.email}</span>
                </div>
              )}
              {user.display_name && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--foreground)]/60">Name:</span>
                  <span className="text-[var(--foreground)]">{user.display_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground)]/60">Role:</span>
                <Badge variant={
                  user.role === 'founder' ? 'secondary' :
                  user.role === 'brand_admin' ? 'primary' : 'default'
                }>
                  {user.role}
                </Badge>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Button onClick={handleContinue} variant="primary" className="w-full">
              Continue to Dashboard
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Link href="/climate">
                <Button variant="outline" size="sm" className="w-full">
                  Climate OS
                </Button>
              </Link>
              <Link href="/agents">
                <Button variant="outline" size="sm" className="w-full">
                  Agents
                </Button>
              </Link>
              <Link href="/journal">
                <Button variant="outline" size="sm" className="w-full">
                  Journal
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-[var(--foreground)]/40">
            <p>ZORA CORE - Multi-agent, climate-first AI operating system</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <span className="text-[var(--primary)]">ZORA</span>{' '}
              <span className="text-[var(--foreground)]">CORE</span>
            </h1>
          </Link>
          <h2 className="mt-4 text-xl text-[var(--foreground)]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            Enter your email and password to access the dashboard
          </p>
        </div>

        <Card variant="default" padding="lg">
          {!showLegacyLogin ? (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                  Email
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[var(--danger)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-[var(--danger)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="w-full"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleLegacyLogin}>
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-[var(--foreground)]">
                  JWT Token
                </label>
                <div className="mt-2">
                  <textarea
                    id="token"
                    name="token"
                    rows={5}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent font-mono text-sm"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={legacyToken}
                    onChange={(e) => setLegacyToken(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--foreground)]/50">
                  Get a token from{' '}
                  <Link href="/admin/setup" className="text-[var(--primary)] hover:underline">
                    Admin Setup
                  </Link>
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[var(--danger)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-[var(--danger)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="w-full"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in with Token'}
              </Button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={() => {
                setShowLegacyLogin(!showLegacyLogin);
                setError(null);
              }}
              className="text-sm text-[var(--foreground)]/60 hover:text-[var(--primary)]"
            >
              {showLegacyLogin ? 'Use email login instead' : 'Use JWT token login (legacy)'}
            </button>
          </div>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--foreground)]/60">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--primary)] hover:underline">
              Sign up
            </Link>
          </p>
          <Link href="/mashups" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--primary)] block">
            Browse public mashups without signing in
          </Link>
        </div>

        <div className="text-center text-xs text-[var(--foreground)]/40">
          <p>ZORA CORE - Multi-agent, climate-first AI operating system</p>
        </div>
      </div>
    </div>
  );
}
