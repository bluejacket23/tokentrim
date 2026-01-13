'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors,
  User,
  CreditCard,
  LogOut,
  Download,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionData {
  status: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due';
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchSubscription();
    }
  }, [session]);

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      // Refresh subscription status after successful checkout
      setTimeout(() => {
        fetchSubscription(true);
        // Clean up URL
        router.replace('/dashboard');
      }, 500);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [router]);

  const fetchSubscription = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        console.log('Subscription status:', data);
        // Map subscriptionStatus to status for compatibility
        setSubscription({
          status: data.subscriptionStatus || data.status || 'none',
          trialEndsAt: data.trialEndsAt,
          trialDaysRemaining: data.trialDaysRemaining,
          currentPeriodEnd: data.currentPeriodEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        });
      } else {
        const error = await response.json();
        console.error('Failed to fetch subscription:', error);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-trim-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const hasValidAccess = subscription?.status === 'active' || 
    (subscription?.status === 'trialing' && (subscription?.trialDaysRemaining ?? 0) > 0);

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Header */}
      <header className="border-b border-ink-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-trim-500/10 rounded-xl flex items-center justify-center border border-trim-500/20">
              <Scissors className="w-5 h-5 text-trim-400" />
            </div>
            <span className="text-xl font-bold text-ink-100">TokenTrim</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-ink-400">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 text-ink-400 hover:text-ink-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Success Message */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-trim-500/10 border border-trim-500/20 rounded-xl p-4 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-trim-400" />
              <div>
                <p className="text-trim-300 font-medium">Payment successful!</p>
                <p className="text-trim-400 text-sm">Your subscription is being activated...</p>
              </div>
            </motion.div>
          )}

          {/* Welcome */}
          <div>
            <h1 className="text-3xl font-bold text-ink-100">
              Welcome, {session.user?.name || 'there'}! 👋
            </h1>
            <p className="text-ink-400 mt-2">
              Manage your subscription and get started with TokenTrim.
            </p>
          </div>

          {/* Subscription Status Card */}
          <div className="bg-ink-900/50 border border-ink-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-trim-400" />
                <h2 className="text-lg font-semibold text-ink-100">Subscription</h2>
              </div>
              <button
                onClick={() => fetchSubscription(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh subscription status"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {subscription?.status === 'active' && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-trim-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-trim-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">Pro Plan Active</h3>
                  {subscription.cancelAtPeriodEnd ? (
                    <p className="text-yellow-400 text-sm mt-1">
                      ⚠️ Subscription will cancel on{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  ) : (
                    <p className="text-ink-400 text-sm mt-1">
                      Your subscription renews on{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  )}
                  <p className="text-ink-500 text-xs mt-2">
                    Manage your subscription, update payment method, or cancel anytime.
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    className="mt-4 text-trim-400 hover:text-trim-300 text-sm font-medium flex items-center gap-1"
                  >
                    Manage Subscription <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {subscription?.status === 'trialing' && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">Free Trial Active</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    {subscription.trialDaysRemaining} days remaining
                    {subscription.trialEndsAt && (
                      <> (ends {new Date(subscription.trialEndsAt).toLocaleDateString()})</>
                    )}
                  </p>
                  <p className="text-ink-500 text-xs mt-2">
                    Your subscription will automatically activate after the trial ends. You can cancel anytime.
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    className="mt-4 text-trim-400 hover:text-trim-300 text-sm font-medium flex items-center gap-1"
                  >
                    Manage Subscription <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {subscription?.status === 'past_due' && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">Payment Required</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Your payment failed. Please update your payment method to continue using TokenTrim.
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    className="mt-4 btn-primary text-sm"
                  >
                    Update Payment Method
                  </button>
                </div>
              </div>
            )}

            {(!subscription?.status || subscription.status === 'none' || subscription.status === 'canceled') && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">No Active Subscription</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Subscribe to use the TokenTrim extension and save on AI tokens.
                  </p>
                  <button
                    onClick={handleSubscribe}
                    className="mt-4 btn-primary text-sm"
                  >
                    Subscribe Now - $2.99/mo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Getting Started Card */}
          <div className="bg-ink-900/50 border border-ink-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-5 h-5 text-trim-400" />
              <h2 className="text-lg font-semibold text-ink-100">Getting Started</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Install the Extension</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Search for "TokenTrim" in VS Code or Cursor extensions marketplace.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Sign In</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Click "Sign In" in the extension sidebar. You'll be redirected to sign in with the same account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Start Optimizing</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Paste your prompts and watch TokenTrim optimize them in real-time!
                  </p>
                </div>
              </div>
            </div>

            {!hasValidAccess && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 text-sm">
                  ⚠️ You need an active subscription to use the extension. Subscribe above to get started!
                </p>
              </div>
            )}
          </div>

          {/* Account Card */}
          <div className="bg-ink-900/50 border border-ink-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-trim-400" />
              <h2 className="text-lg font-semibold text-ink-100">Account</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-ink-800">
                <span className="text-ink-400">Email</span>
                <span className="text-ink-200">{session.user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-ink-800">
                <span className="text-ink-400">Name</span>
                <span className="text-ink-200">{session.user?.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-ink-400">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  hasValidAccess 
                    ? 'bg-trim-500/10 text-trim-400' 
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {subscription?.status === 'active' && 'Pro'}
                  {subscription?.status === 'trialing' && 'Trial'}
                  {subscription?.status === 'canceled' && 'Canceled'}
                  {(!subscription?.status || subscription.status === 'none') && 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
