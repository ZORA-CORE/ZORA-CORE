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

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSuccess) {
      router.push("/dashboard");
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
    router.push("/dashboard");
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
                <span className="text-[var(--primary)]">ZORA</span>{" "}
                <span className="text-[var(--foreground)]">CORE</span>
              </h1>
            </Link>
            <h2 className="mt-4 text-xl text-[var(--primary)]">
              Account Created Successfully
            </h2>
          </div>

          <Card variant="default" padding="lg">
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-4">Welcome to ZORA CORE!</h3>
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
                  user.role === "founder" ? "secondary" :
                  user.role === "brand_admin" ? "primary" : "default"
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
              <span className="text-[var(--primary)]">ZORA</span>{" "}
              <span className="text-[var(--foreground)]">CORE</span>
            </h1>
          </Link>
          <h2 className="mt-4 text-xl text-[var(--foreground)]">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            Join ZORA CORE to access climate-first AI tools
          </p>
        </div>

        <Card variant="default" padding="lg">
          <form className="space-y-6" onSubmit={handleSignup}>
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
                  required
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[var(--foreground)]">
                Display Name <span className="text-[var(--foreground)]/40">(optional)</span>
              </label>
              <div className="mt-2">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)]">
                Confirm Password
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-4">
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="w-full"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--foreground)]/60">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-[var(--foreground)]/40">
          <p>ZORA CORE - Multi-agent, climate-first AI operating system</p>
        </div>
      </div>
    </div>
  );
}

