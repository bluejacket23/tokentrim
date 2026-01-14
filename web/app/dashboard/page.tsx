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
  Key,
  Copy,
  Check,
  Mail,
} from 'lucide-react';

interface SubscriptionData {
  status: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due';
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  licenseKey?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      setTimeout(() => {
        fetchSubscription(true);
        router.replace('/dashboard');
      }, 500);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [router]);

  const fetchSubscription = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscription({
          status: data.subscriptionStatus || data.status || 'none',
          trialEndsAt: data.trialEndsAt,
          trialDaysRemaining: data.trialDaysRemaining,
          currentPeriodEnd: data.currentPeriodEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          licenseKey: data.licenseKey,
        });
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

  const copyLicenseKey = async () => {
    if (subscription?.licenseKey) {
      await navigator.clipboard.writeText(subscription.licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const emailLicenseKey = async () => {
    try {
      const response = await fetch('/api/license/email', {
        method: 'POST',
      });
      if (response.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to email license key:', error);
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

  const hasValidAccess = subscription?.licenseKey && (
    subscription?.status === 'active' || 
    (subscription?.status === 'trialing' && (subscription?.trialDaysRemaining ?? 0) > 0)
  );

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

          {/* License Key Card - Only shown when user has subscribed */}
          {hasValidAccess && subscription?.licenseKey && (
            <div className="bg-gradient-to-br from-trim-500/10 to-trim-600/5 border-2 border-trim-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-trim-400" />
                <h2 className="text-lg font-semibold text-ink-100">Your License Key</h2>
              </div>
              
              <p className="text-ink-400 text-sm mb-4">
                Enter this key in the TokenTrim extension to activate it.
              </p>

              <div className="bg-ink-950/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <code className="text-2xl font-mono font-bold text-trim-400 tracking-wider select-all">
                  {subscription.licenseKey}
                </code>
                <div className="flex gap-2">
                  <button
                    onClick={copyLicenseKey}
                    className="flex items-center gap-2 px-4 py-2 bg-trim-500 hover:bg-trim-400 text-ink-950 rounded-lg font-medium transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={emailLicenseKey}
                    className="flex items-center gap-2 px-4 py-2 bg-ink-800 hover:bg-ink-700 text-ink-200 rounded-lg font-medium transition-colors"
                    title="Email license key to yourself"
                  >
                    {emailSent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    {emailSent ? 'Sent!' : 'Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscribe CTA for new users */}
          {(!subscription?.status || subscription.status === 'none') && (
            <div className="bg-gradient-to-br from-trim-500/20 to-trim-600/10 border-2 border-trim-500/40 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-trim-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-trim-400" />
              </div>
              <h2 className="text-2xl font-bold text-ink-100 mb-2">Get Started with TokenTrim</h2>
              <p className="text-ink-400 mb-6 max-w-md mx-auto">
                Subscribe to get your license key and start optimizing your AI prompts. 
                Includes a <span className="text-trim-400 font-semibold">7-day free trial</span>!
              </p>
              <button
                onClick={handleSubscribe}
                className="btn-primary text-lg px-8 py-3"
              >
                Start Free Trial - $2.99/mo after
              </button>
              <p className="text-ink-500 text-sm mt-3">
                Cancel anytime. No charge during trial period.
              </p>
            </div>
          )}

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
                      ⚠️ Cancels on {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  ) : (
                    <p className="text-ink-400 text-sm mt-1">
                      Renews {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  )}
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
                  </p>
                  <p className="text-ink-500 text-xs mt-2">
                    Your trial will convert to a paid subscription automatically.
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
                    Please update your payment method to continue.
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

            {subscription?.status === 'canceled' && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">Subscription Canceled</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Your license key is no longer active. Resubscribe to continue using TokenTrim.
                  </p>
                  <button
                    onClick={handleSubscribe}
                    className="mt-4 btn-primary text-sm"
                  >
                    Resubscribe - $2.99/mo
                  </button>
                </div>
              </div>
            )}

            {(!subscription?.status || subscription.status === 'none') && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ink-800 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-ink-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-100">No Subscription Yet</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Subscribe above to get your license key and start your 7-day free trial.
                  </p>
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${hasValidAccess ? 'bg-trim-500/20 text-trim-400' : 'bg-trim-500/10 text-trim-400'}`}>
                  {hasValidAccess ? '✓' : '1'}
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Subscribe to TokenTrim</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    {hasValidAccess 
                      ? 'You have an active subscription!'
                      : 'Start your 7-day free trial with a credit card.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Install the Extension</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Search for "TokenTrim" in VS Code or Cursor extensions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Enter Your License Key</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    {hasValidAccess 
                      ? 'Copy your license key above and paste it in the extension.'
                      : 'After subscribing, your license key will appear above.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-trim-500/10 rounded-lg flex items-center justify-center text-trim-400 font-bold text-sm">
                  4
                </div>
                <div>
                  <h3 className="font-medium text-ink-100">Start Optimizing</h3>
                  <p className="text-ink-400 text-sm mt-1">
                    Paste your prompts and watch them get optimized in real-time!
                  </p>
                </div>
              </div>
            </div>
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
