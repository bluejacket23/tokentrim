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

  // Register URI handler for OAuth callback
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri: async (uri: vscode.Uri) => {
        if (uri.path === '/auth/callback') {
          await handleAuthCallback(uri);
        }
      }
    })
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.login', async () => {
      await handleLogin();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.logout', async () => {
      await handleLogout();
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

  // Load existing session on startup
  initializeSession();
}

async function initializeSession() {
  const session = await apiClient.loadSession();
  
  if (session) {
    // Refresh subscription status in background
    const status = await apiClient.refreshSubscriptionStatus();
    
    if (status.valid) {
      if (status.status === 'trialing' && status.trialDaysRemaining) {
        vscode.window.showInformationMessage(
          `TokenTrim: Welcome back! ${status.trialDaysRemaining} days left in your trial.`
        );
      }
    } else {
      vscode.window.showWarningMessage(
        status.message || 'TokenTrim: Please subscribe to continue.',
        'Subscribe'
      ).then(action => {
        if (action === 'Subscribe') {
          vscode.commands.executeCommand('tokentrim.subscribe');
        }
      });
    }
  }

  chatPanelProvider.updateAuthStatus();
}

async function handleLogin() {
  try {
    const loginUrl = apiClient.getLoginUrl();
    
    // Open browser to login page
    const opened = await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    
    if (opened) {
      vscode.window.showInformationMessage(
        'TokenTrim: Complete sign-in in your browser, then return here.'
      );
    } else {
      vscode.window.showErrorMessage(
        'TokenTrim: Could not open browser. Please visit tokentrim.com to sign in.'
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`TokenTrim: Login failed - ${error.message}`);
  }
}

async function handleAuthCallback(uri: vscode.Uri) {
  try {
    const params = new URLSearchParams(uri.query);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      vscode.window.showErrorMessage(`TokenTrim: Login failed - ${error}`);
      return;
    }

    if (!code || !state) {
      vscode.window.showErrorMessage('TokenTrim: Invalid auth callback');
      return;
    }

    // Exchange code for session
    const session = await apiClient.exchangeAuthCode(code, state);
    
    // Update UI
    chatPanelProvider.updateAuthStatus();

    // Show welcome message based on subscription status
    const status = apiClient.getSubscriptionStatus();
    
    if (status.valid) {
      if (status.status === 'trialing') {
        vscode.window.showInformationMessage(
          `Welcome to TokenTrim, ${session.name || session.email}! You have ${status.trialDaysRemaining} days left in your free trial.`
        );
      } else {
        vscode.window.showInformationMessage(
          `Welcome back, ${session.name || session.email}! TokenTrim is ready.`
        );
      }
    } else {
      vscode.window.showWarningMessage(
        'TokenTrim: Your trial has expired. Subscribe to continue optimizing prompts.',
        'Subscribe'
      ).then(action => {
        if (action === 'Subscribe') {
          vscode.commands.executeCommand('tokentrim.subscribe');
        }
      });
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`TokenTrim: Login failed - ${error.message}`);
  }
}

async function handleLogout() {
  await apiClient.logout();
  chatPanelProvider.updateAuthStatus();
  vscode.window.showInformationMessage('TokenTrim: Signed out successfully.');
}

export function deactivate() {}
