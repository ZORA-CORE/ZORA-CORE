'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DecodedToken {
  tenant_id: string;
  user_id: string;
  role: string;
  iat: number;
  exp: number;
}

function decodeTokenPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect if already authenticated (after showing success message)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSuccess) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setDecodedToken(null);

    const trimmedToken = token.trim();
    
    if (!trimmedToken) {
      setError('Please enter a JWT token');
      setIsSubmitting(false);
      return;
    }

    // Validate token format
    const parts = trimmedToken.split('.');
    if (parts.length !== 3) {
      setError('Invalid token format. JWT tokens have 3 parts separated by dots.');
      setIsSubmitting(false);
      return;
    }

    // Decode token to show info
    const decoded = decodeTokenPayload(trimmedToken);
    if (!decoded) {
      setError('Failed to decode token. Please check your token format.');
      setIsSubmitting(false);
      return;
    }

    const success = login(trimmedToken);
    
    if (success) {
      setDecodedToken(decoded);
      setShowSuccess(true);
    } else {
      setError('Invalid or expired token. Please check your token and try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleContinue = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (showSuccess && decodedToken) {
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
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-4">Token Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground)]/60">Tenant ID:</span>
                <span className="font-mono text-[var(--foreground)] text-xs">{decodedToken.tenant_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground)]/60">User ID:</span>
                <span className="font-mono text-[var(--foreground)] text-xs">{decodedToken.user_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground)]/60">Role:</span>
                <Badge variant={
                  decodedToken.role === 'founder' ? 'secondary' :
                  decodedToken.role === 'brand_admin' ? 'primary' : 'default'
                }>
                  {decodedToken.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground)]/60">Expires:</span>
                <span className="text-[var(--foreground)] text-xs">{new Date(decodedToken.exp * 1000).toLocaleString()}</span>
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
            Enter your JWT token to access the dashboard
          </p>
        </div>

        <Card variant="bordered" padding="md">
          <p className="text-sm text-[var(--foreground)]">
            <strong>Founder?</strong> If you need to set up tenants, users, or generate tokens,{' '}
            <Link href="/admin/setup" className="text-[var(--primary)] underline hover:text-[var(--primary)]/80">
              visit the Admin Setup page
            </Link>.
          </p>
        </Card>

        <Card variant="default" padding="lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
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
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <Link href="/mashups" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--primary)]">
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
