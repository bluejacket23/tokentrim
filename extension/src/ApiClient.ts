import * as vscode from 'vscode';
import fetch from 'node-fetch';

export interface LicenseInfo {
  valid: boolean;
  email?: string;
  name?: string;
  subscriptionStatus?: string;
  trialDaysRemaining?: number;
  message?: string;
}

export class ApiClient {
  private context: vscode.ExtensionContext;
  private _licenseKey: string | null = null;
  private _licenseInfo: LicenseInfo | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getBackendUrl(): string {
    const config = vscode.workspace.getConfiguration('tokentrim');
    
    // Check if web URL is localhost (dev mode)
    const webUrl = config.get<string>('webUrl');
    if (webUrl && webUrl.includes('localhost')) {
      return 'http://localhost:4000';
    }
    
    // Use configured API URL or production default
    const apiUrl = config.get<string>('apiUrl');
    if (apiUrl && !apiUrl.includes('api.tokentrim.com')) {
      return apiUrl;
    }
    
    return 'https://dxtbchard5.execute-api.us-east-1.amazonaws.com';
  }

  // Load license key from secure storage
  async loadLicenseKey(): Promise<string | null> {
    try {
      this._licenseKey = await this.context.secrets.get('tokentrim.licenseKey') || null;
      return this._licenseKey;
    } catch (error) {
      console.error('Failed to load license key:', error);
      return null;
    }
  }

  // Save license key to secure storage
  async saveLicenseKey(key: string): Promise<void> {
    this._licenseKey = key;
    await this.context.secrets.store('tokentrim.licenseKey', key);
  }

  // Clear license key
  async clearLicenseKey(): Promise<void> {
    this._licenseKey = null;
    this._licenseInfo = null;
    await this.context.secrets.delete('tokentrim.licenseKey');
  }

  getLicenseKey(): string | null {
    return this._licenseKey;
  }

  getLicenseInfo(): LicenseInfo | null {
    return this._licenseInfo;
  }

  hasLicenseKey(): boolean {
    return this._licenseKey !== null && this._licenseKey.length > 0;
  }

  hasValidLicense(): boolean {
    return this._licenseInfo?.valid === true;
  }

  // Validate license key with backend
  async validateLicenseKey(key?: string): Promise<LicenseInfo> {
    const licenseKey = key || this._licenseKey;
    
    if (!licenseKey) {
      return { valid: false, message: 'No license key provided' };
    }

    try {
      const response = await fetch(`${this.getBackendUrl()}/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        this._licenseInfo = { valid: false, message: error.message || 'Invalid license key' };
        return this._licenseInfo;
      }

      const data = await response.json() as any;
      
      this._licenseInfo = {
        valid: data.valid,
        email: data.email,
        name: data.name,
        subscriptionStatus: data.subscriptionStatus,
        trialDaysRemaining: data.trialDaysRemaining,
        message: data.message,
      };

      // If key was passed in and is valid, save it
      if (key && data.valid) {
        await this.saveLicenseKey(key);
      }

      return this._licenseInfo;
    } catch (error: any) {
      console.error('Failed to validate license:', error);
      this._licenseInfo = { valid: false, message: 'Could not connect to server. Using offline mode.' };
      // Allow offline usage if they have a key stored
      if (this._licenseKey) {
        this._licenseInfo.valid = true;
      }
      return this._licenseInfo;
    }
  }
}
