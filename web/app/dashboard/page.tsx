'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors,
  Key,
  CreditCard,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  Download,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

interface UserData {
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'none';
  customerId?: string;
  keys: ApiKey[];
  usage?: {
    promptsOptimized: number;
    tokensSaved: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [userData, setUserData] = useState<UserData>({
    subscriptionStatus: 'none',
    keys: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchUserData() {
      if (!session?.user?.email) return;

      try {
        // Fetch user subscription and keys from API
        const [keysRes, userRes] = await Promise.all([
          fetch('/api/keys'),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?email=${encodeURIComponent(session.user.email)}`),
        ]);

        const keysData = await keysRes.json();
        let subscriptionData = { subscriptionStatus: 'none', customerId: null };
        
        if (userRes.ok) {
          subscriptionData = await userRes.json();
        }

        setUserData({
          subscriptionStatus: subscriptionData.subscriptionStatus || 'none',
          customerId: subscriptionData.customerId,
          keys: keysData.keys || [],
          usage: {
            promptsOptimized: 0,
            tokensSaved: 0,
          },
        });
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // For demo purposes, set some mock data
        setUserData({
          subscriptionStatus: 'none',
          keys: [],
          usage: {
            promptsOptimized: 0,
            tokensSaved: 0,
          },
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [session]);

  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    if (!userData.customerId) return;

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: userData.customerId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreatingKey(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewlyCreatedKey(data.key);
        setUserData((prev) => ({
          ...prev,
          keys: [...prev.keys, { id: data.id, name: newKeyName, key: data.key, createdAt: new Date().toISOString() }],
        }));
        setNewKeyName('');
        setShowNewKeyDialog(false);
      } else {
        alert(data.error || 'Failed to create key');
      }
    } catch (error) {
      console.error('Create key error:', error);
      alert('Failed to create API key. Please try again.');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });

      if (response.ok) {
        setUserData((prev) => ({
          ...prev,
          keys: prev.keys.filter((k) => k.id !== keyId),
        }));
      }
    } catch (error) {
      console.error('Delete key error:', error);
      alert('Failed to delete API key. Please try again.');
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 7) + '••••••••••••••••' + key.substring(key.length - 4);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-trim-500/30 border-t-trim-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isSubscribed = userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing';

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-trim-500 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-ink-950" />
            </div>
            <span className="text-xl font-display font-bold">TokenTrim</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-ink-300">{session?.user?.name || session?.user?.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-ink-400 hover:text-ink-200 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Success/Cancel Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-trim-500/10 border border-trim-500/20 rounded-xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-trim-400" />
            <span className="text-trim-300">
              Payment successful! Your subscription is now active.
            </span>
          </motion.div>
        )}

        {canceled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-300">
              Checkout was canceled. You can subscribe anytime.
            </span>
          </motion.div>
        )}

        {/* New Key Created Alert */}
        {newlyCreatedKey && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-trim-500/10 border border-trim-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-trim-400" />
                <span className="text-trim-300">API key created successfully!</span>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="text-ink-400 hover:text-ink-200"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-ink-900 rounded-lg font-mono text-sm text-trim-300">
                {newlyCreatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
                className="p-2 bg-ink-800 rounded-lg hover:bg-ink-700 transition-colors"
              >
                {copiedKey === 'new' ? (
                  <Check className="w-4 h-4 text-trim-400" />
                ) : (
                  <Copy className="w-4 h-4 text-ink-400" />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-400">
              ⚠️ Copy this key now. You won't be able to see it again.
            </p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Subscription Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="feature-icon">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold">Subscription</h2>
                <p className="text-ink-400 text-sm">Manage your TokenTrim subscription</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-ink-800/30 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isSubscribed ? 'bg-trim-500' : 'bg-ink-500'
                }`} />
                <div>
                  <p className="font-medium">
                    {userData.subscriptionStatus === 'active' && 'Pro Plan Active'}
                    {userData.subscriptionStatus === 'trialing' && 'Free Trial Active'}
                    {userData.subscriptionStatus === 'canceled' && 'Subscription Canceled'}
                    {userData.subscriptionStatus === 'none' && 'No Active Subscription'}
                  </p>
                  <p className="text-sm text-ink-400">
                    {isSubscribed ? '$3.99/month' : 'Subscribe to access all features'}
                  </p>
                </div>
              </div>
              
              {isSubscribed ? (
                <button
                  onClick={handleManageSubscription}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  className="btn-primary flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Subscribe
                </button>
              )}
            </div>

            {!isSubscribed && (
              <div className="p-4 bg-trim-500/5 border border-trim-500/20 rounded-xl">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-trim-400" />
                  Start your 7-day free trial
                </h3>
                <p className="text-ink-400 text-sm">
                  Get full access to TokenTrim for 7 days. No credit card required to start.
                  Cancel anytime during the trial period.
                </p>
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="font-display font-semibold mb-4">Usage This Month</h3>
            <div className="space-y-4">
              <div className="p-4 bg-ink-800/30 rounded-xl">
                <p className="text-2xl font-bold gradient-text">
                  {userData.usage?.promptsOptimized || 0}
                </p>
                <p className="text-ink-400 text-sm">Prompts Optimized</p>
              </div>
              <div className="p-4 bg-ink-800/30 rounded-xl">
                <p className="text-2xl font-bold gradient-text">
                  {userData.usage?.tokensSaved || 0}
                </p>
                <p className="text-ink-400 text-sm">Tokens Saved</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* API Keys Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="feature-icon">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold">API Keys</h2>
                <p className="text-ink-400 text-sm">
                  Use these keys to authenticate the VS Code extension
                </p>
              </div>
            </div>

            {isSubscribed && (
              <button
                onClick={() => setShowNewKeyDialog(true)}
                className="btn-primary flex items-center gap-2"
                disabled={userData.keys.length >= 3}
              >
                <Plus className="w-4 h-4" />
                New Key
              </button>
            )}
          </div>

          {!isSubscribed ? (
            <div className="text-center py-12 text-ink-400">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Subscribe to create API keys and use the VS Code extension.</p>
            </div>
          ) : userData.keys.length === 0 ? (
            <div className="text-center py-12 text-ink-400">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userData.keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 bg-ink-800/30 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ink-700/50 flex items-center justify-center">
                      <Key className="w-5 h-5 text-ink-400" />
                    </div>
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <code className="text-sm text-ink-400 font-mono">
                        {maskKey(key.key)}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(key.key, key.id)}
                      className="p-2 bg-ink-700/50 rounded-lg hover:bg-ink-700 transition-colors"
                      title="Copy key"
                    >
                      {copiedKey === key.id ? (
                        <Check className="w-4 h-4 text-trim-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-ink-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 bg-ink-700/50 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userData.keys.length >= 3 && (
            <p className="mt-4 text-sm text-ink-500">
              Maximum 3 API keys per account.
            </p>
          )}
        </motion.div>

        {/* Extension Download */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="feature-icon">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">VS Code Extension</h2>
              <p className="text-ink-400 text-sm">
                Install the extension to start optimizing your prompts
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="vscode:extension/tokentrim.tokentrim"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install for VS Code
            </a>
            <a
              href="cursor:extension/tokentrim.tokentrim"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install for Cursor
            </a>
          </div>

          <div className="mt-4 p-4 bg-ink-800/30 rounded-xl">
            <h4 className="font-medium mb-2">Quick Setup</h4>
            <ol className="text-sm text-ink-400 space-y-2">
              <li>1. Install the extension from the marketplace</li>
              <li>2. Open the command palette (Ctrl/Cmd + Shift + P)</li>
              <li>3. Run "TokenTrim: Set API Key" and paste your key</li>
              <li>4. Open the TokenTrim panel and start optimizing!</li>
            </ol>
          </div>
        </motion.div>
      </main>

      {/* New Key Dialog */}
      {showNewKeyDialog && (
        <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-4 card"
          >
            <h3 className="text-xl font-display font-semibold mb-4">Create New API Key</h3>
            <p className="text-ink-400 text-sm mb-4">
              Give your key a name to help you remember what it's used for.
            </p>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., VS Code - Work Laptop"
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewKeyDialog(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || isCreatingKey}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {isCreatingKey ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}













