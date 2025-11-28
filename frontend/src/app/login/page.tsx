'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (showSuccess && decodedToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-bold text-gray-900">
              ZORA CORE
            </h1>
            <h2 className="mt-2 text-center text-xl text-green-600">
              Login Successful
            </h2>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Token Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tenant ID:</span>
                <span className="font-mono text-gray-900 text-xs">{decodedToken.tenant_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">User ID:</span>
                <span className="font-mono text-gray-900 text-xs">{decodedToken.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  decodedToken.role === 'founder'
                    ? 'bg-purple-100 text-purple-800'
                    : decodedToken.role === 'brand_admin'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {decodedToken.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expires:</span>
                <span className="text-gray-900">{new Date(decodedToken.exp * 1000).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Dashboard
            </button>
            
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/climate"
                className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
              >
                Climate OS
              </Link>
              <Link
                href="/agents"
                className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
              >
                Agents
              </Link>
              <Link
                href="/journal"
                className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
              >
                Journal
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400">
            <p>ZORA CORE - Multi-agent, climate-first AI operating system</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            ZORA CORE
          </h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Enter your JWT token to access the dashboard
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-700">
            <strong>Founder?</strong> If you need to set up tenants, users, or generate tokens,{' '}
            <Link href="/admin/setup" className="underline hover:text-blue-800">
              visit the Admin Setup page
            </Link>.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              JWT Token
            </label>
            <div className="mt-1">
              <textarea
                id="token"
                name="token"
                rows={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Generate a token using the CLI:{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded">
                python -m zora_core.auth.cli issue-token
              </code>
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Dev Mode</span>
            </div>
          </div>

          <div className="mt-6 bg-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Generate a development token
            </h3>
            <div className="text-xs text-gray-600 space-y-2">
              <p>1. Set the JWT secret environment variable:</p>
              <code className="block bg-white px-2 py-1 rounded border text-gray-800">
                export ZORA_JWT_SECRET=&quot;your-secret-key&quot;
              </code>
              <p>2. Generate a token using the CLI:</p>
              <code className="block bg-white px-2 py-1 rounded border text-gray-800">
                python -m zora_core.auth.cli issue-token -v
              </code>
              <p>3. Copy the token and paste it above.</p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          <p>ZORA CORE - Multi-agent, climate-first AI operating system</p>
        </div>
      </div>
    </div>
  );
}
