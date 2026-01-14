import * as vscode from 'vscode';
import { ChatPanelProvider } from './ChatPanelProvider';
import { ApiClient } from './ApiClient';

let apiClient: ApiClient;
let chatPanelProvider: ChatPanelProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('TokenTrim extension is now active!');

  // Initialize API client
  apiClient = new ApiClient(context);

  // Initialize chat panel provider
  chatPanelProvider = new ChatPanelProvider(context, apiClient);

  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatPanelProvider.viewType,
      chatPanelProvider
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.setLicenseKey', async () => {
      await handleSetLicenseKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.clearLicenseKey', async () => {
      await handleClearLicenseKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.copyOptimized', () => {
      chatPanelProvider.copyOptimized();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.clearInput', () => {
      chatPanelProvider.clearInput();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.subscribe', async () => {
      const webUrl = vscode.workspace.getConfiguration('tokentrim').get<string>('webUrl') || 'https://tokentrim.com';
      vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/dashboard`));
    })
  );

  // Load existing license key on startup
  initializeLicense();
}

async function initializeLicense() {
  const licenseKey = await apiClient.loadLicenseKey();
  
  if (licenseKey) {
    // Validate the stored license key
    const result = await apiClient.validateLicenseKey();
    
    if (result.valid) {
      if (result.subscriptionStatus === 'trialing' && result.trialDaysRemaining) {
        vscode.window.showInformationMessage(
          `TokenTrim: ${result.trialDaysRemaining} days left in your trial.`
        );
      }
    } else {
      vscode.window.showWarningMessage(
        result.message || 'TokenTrim: License expired. Please subscribe to continue.',
        'Get License'
      ).then(action => {
        if (action === 'Get License') {
          vscode.commands.executeCommand('tokentrim.subscribe');
        }
      });
    }
  }

  chatPanelProvider.updateLicenseStatus();
}

async function handleSetLicenseKey() {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your TokenTrim license key',
    placeHolder: 'TT-XXXX-XXXX-XXXX',
    password: false,
    validateInput: (value) => {
      if (!value) return 'License key is required';
      if (!value.startsWith('TT-')) return 'License key should start with TT-';
      return null;
    }
  });

  if (!key) return;

  // Validate the key
  const result = await apiClient.validateLicenseKey(key);
  
  if (result.valid) {
    chatPanelProvider.updateLicenseStatus();
    
    if (result.subscriptionStatus === 'trialing' && result.trialDaysRemaining) {
      vscode.window.showInformationMessage(
        `Welcome to TokenTrim! You have ${result.trialDaysRemaining} days left in your free trial.`
      );
    } else {
      vscode.window.showInformationMessage(
        `TokenTrim activated! Welcome${result.name ? ', ' + result.name : ''}!`
      );
    }
  } else {
    vscode.window.showErrorMessage(
      result.message || 'Invalid license key. Please check and try again.'
    );
  }
}

async function handleClearLicenseKey() {
  await apiClient.clearLicenseKey();
  chatPanelProvider.updateLicenseStatus();
  vscode.window.showInformationMessage('TokenTrim: License key removed.');
}

export function deactivate() {}
