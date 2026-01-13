'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Scissors, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const state = searchParams.get('state');
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // If user is already logged in, redirect to extension
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      handleRedirectToExtension();
    }
  }, [status, session]);

  const handleRedirectToExtension = async () => {
    if (!state) {
      setError('Missing state parameter. Please try signing in from the extension again.');
      return;
    }

    try {
      // Generate auth code for extension
      const response = await fetch('/api/auth/extension-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate auth code');
      }

      const { code } = await response.json();
      
      // Redirect to VS Code extension
      const vscodeUri = `vscode://tokentrim.tokentrim/auth/callback?code=${code}&state=${state}`;
      window.location.href = vscodeUri;
      
      // Also try cursor:// in case they're using Cursor
      setTimeout(() => {
        window.location.href = `cursor://tokentrim.tokentrim/auth/callback?code=${code}&state=${state}`;
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to complete authentication');
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: `/auth/extension?state=${state}` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Sign in with credentials
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          // Will redirect via useEffect when session updates
        }
      } else {
        // Register new user
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Sign in after registration
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-trim-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show redirect message if authenticated
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-ink-900 p-8 rounded-2xl text-center max-w-md"
        >
          <div className="w-16 h-16 bg-trim-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-trim-400" />
          </div>
          <h2 className="text-xl font-bold text-ink-100 mb-2">Opening Extension...</h2>
          <p className="text-ink-400 mb-4">
            You should be redirected to VS Code or Cursor automatically.
          </p>
          <p className="text-ink-500 text-sm">
            If nothing happens, make sure the TokenTrim extension is installed.
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-trim-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-trim-500/20">
            <Scissors className="w-8 h-8 text-trim-400" />
          </div>
          <h1 className="text-2xl font-bold text-ink-100">
            {isLogin ? 'Sign in to TokenTrim' : 'Create your account'}
          </h1>
          <p className="text-ink-400 mt-2">
            {isLogin 
              ? 'Sign in to use the extension' 
              : 'Start your 7-day free trial'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-ink-900/50 border border-ink-800 rounded-2xl p-6">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-gray-100 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-ink-900/50 text-ink-500">or</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  className="input pl-12"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="input pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="input pl-12"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-ink-900 border-t-transparent rounded-full" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="mt-6 text-center text-sm text-ink-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-trim-400 hover:text-trim-300 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}






