import * as vscode from 'vscode';
import fetch from 'node-fetch';

export interface UserSession {
  email: string;
  name?: string;
  token: string;
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'expired' | 'none';
  trialDaysRemaining?: number;
  expiresAt: number; // Token expiry timestamp
}

export interface SubscriptionCheck {
  valid: boolean;
  status: string;
  trialDaysRemaining?: number;
  message?: string;
}

export class ApiClient {
  private context: vscode.ExtensionContext;
  private _session: UserSession | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getApiUrl(): string {
    const config = vscode.workspace.getConfiguration('tokentrim');
    const apiUrl = config.get<string>('apiUrl');
    if (apiUrl) return apiUrl;
    
    // If webUrl is set to localhost, use it for API too
    const webUrl = config.get<string>('webUrl');
    if (webUrl && webUrl.includes('localhost')) {
      return `${webUrl}/api`;
    }
    
    return 'https://api.tokentrim.com';
  }

  private getWebUrl(): string {
    const config = vscode.workspace.getConfiguration('tokentrim');
    return config.get<string>('webUrl') || 'https://tokentrim.com';
  }

  // Load session from secure storage
  async loadSession(): Promise<UserSession | null> {
    try {
      const sessionData = await this.context.secrets.get('tokentrim.session');
      if (sessionData) {
        this._session = JSON.parse(sessionData);
        // Check if token is expired
        if (this._session && this._session.expiresAt < Date.now()) {
          await this.logout();
          return null;
        }
        return this._session;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return null;
  }

  // Save session to secure storage
  async saveSession(session: UserSession): Promise<void> {
    this._session = session;
    await this.context.secrets.store('tokentrim.session', JSON.stringify(session));
  }

  // Clear session
  async logout(): Promise<void> {
    this._session = null;
    await this.context.secrets.delete('tokentrim.session');
  }

  isLoggedIn(): boolean {
    return this._session !== null && this._session.expiresAt > Date.now();
  }

  getSession(): UserSession | null {
    return this._session;
  }


  // Check if user has valid subscription
  hasValidSubscription(): boolean {
    if (!this._session) return false;
    
    const status = this._session.subscriptionStatus;
    if (status === 'active') return true;
    if (status === 'trialing') {
      // Check if trial is still valid
      return (this._session.trialDaysRemaining ?? 0) > 0;
    }
    return false;
  }

  // Get subscription status for display
  getSubscriptionStatus(): SubscriptionCheck {
    if (!this._session) {
      return { valid: false, status: 'not_logged_in', message: 'Please sign in to use TokenTrim' };
    }

    const status = this._session.subscriptionStatus;
    const trialDays = this._session.trialDaysRemaining;

    if (status === 'active') {
      return { valid: true, status: 'active' };
    }
    
    if (status === 'trialing' && trialDays && trialDays > 0) {
      return { valid: true, status: 'trialing', trialDaysRemaining: trialDays };
    }
    
    if (status === 'trialing' && (!trialDays || trialDays <= 0)) {
      return { valid: false, status: 'expired', message: 'Your free trial has expired. Subscribe to continue.' };
    }

    return { valid: false, status: status, message: 'Please subscribe to use TokenTrim.' };
  }

  // Generate login URL for OAuth
  getLoginUrl(): string {
    // Generate a random state for security
    const state = Math.random().toString(36).substring(2, 15);
    this.context.globalState.update('tokentrim.authState', state);
    
    return `${this.getWebUrl()}/auth/extension?state=${state}`;
  }

  // Exchange auth code for session (called after OAuth callback)
  async exchangeAuthCode(code: string, state: string): Promise<UserSession> {
    // Verify state matches
    const savedState = this.context.globalState.get<string>('tokentrim.authState');
    if (state !== savedState) {
      throw new Error('Invalid auth state. Please try logging in again.');
    }

    const response = await fetch(`${this.getApiUrl()}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, source: 'extension' }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json() as any;
    
    const session: UserSession = {
      email: data.email,
      name: data.name,
      token: data.token,
      subscriptionStatus: data.subscriptionStatus,
      trialDaysRemaining: data.trialDaysRemaining,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    };

    await this.saveSession(session);
    return session;
  }

  // Refresh subscription status from server
  async refreshSubscriptionStatus(): Promise<SubscriptionCheck> {
    if (!this._session) {
      return { valid: false, status: 'not_logged_in' };
    }

    try {
      const response = await fetch(`${this.getApiUrl()}/subscription/status?email=${encodeURIComponent(this._session.email)}`, {
        headers: {
          'Authorization': `Bearer ${this._session.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          return { valid: false, status: 'not_logged_in', message: 'Session expired. Please sign in again.' };
        }
        throw new Error('Failed to check subscription');
      }

      const data = await response.json() as any;
      
      // Update session with latest status
      this._session.subscriptionStatus = data.subscriptionStatus;
      this._session.trialDaysRemaining = data.trialDaysRemaining;
      await this.saveSession(this._session);

      return {
        valid: data.hasValidAccess,
        status: data.subscriptionStatus,
        trialDaysRemaining: data.trialDaysRemaining,
        message: data.hasValidAccess ? undefined : 'Please subscribe to continue using TokenTrim.',
      };
    } catch (error: any) {
      console.error('Failed to refresh subscription:', error);
      // Return cached status on network error
      return this.getSubscriptionStatus();
    }
  }
}
