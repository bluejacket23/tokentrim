import * as vscode from 'vscode';
import fetch from 'node-fetch';

export interface OptimizeResult {
  original: string;
  optimized: string;
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  intent: string;
}

export interface ValidateResult {
  valid: boolean;
  userId?: string;
  subscriptionStatus?: string;
}

export class ApiClient {
  private apiKey: string = '';
  private context: vscode.ExtensionContext;
  private _localMode: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getApiUrl(): string {
    const config = vscode.workspace.getConfiguration('tokentrim');
    return config.get<string>('apiUrl') || 'https://api.tokentrim.com';
  }

  setApiKey(key: string) {
    this.apiKey = key;
    // Enable local mode for testing without backend
    this._localMode = key === 'tt_local' || key === 'tt_test' || key === 'tt_demo';
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  isLocalMode(): boolean {
    return this._localMode;
  }

  enableLocalMode() {
    this._localMode = true;
  }

  async validate(): Promise<ValidateResult> {
    if (!this.apiKey) {
      throw new Error('No API key set');
    }

    const response = await fetch(`${this.getApiUrl()}/keys/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error((error as any).error || 'Validation failed');
    }

    return response.json() as Promise<ValidateResult>;
  }

  async optimize(text: string): Promise<OptimizeResult> {
    if (!this.apiKey) {
      throw new Error('No API key set. Use "TokenTrim: Set API Key" command.');
    }

    const response = await fetch(`${this.getApiUrl()}/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error((error as any).error || 'Optimization failed');
    }

    return response.json() as Promise<OptimizeResult>;
  }

  async trackUsage(promptsOptimized: number, tokensSaved: number): Promise<void> {
    if (!this.apiKey) {
      return;
    }

    try {
      await fetch(`${this.getApiUrl()}/usage/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ promptsOptimized, tokensSaved }),
      });
    } catch (error) {
      // Silently fail - usage tracking is not critical
      console.error('Usage tracking failed:', error);
    }
  }
}

