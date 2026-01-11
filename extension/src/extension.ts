import * as vscode from 'vscode';
import { ChatPanelProvider } from './ChatPanelProvider';
import { ApiClient } from './ApiClient';
import { LocalOptimizer } from './optimizer/LocalOptimizer';

let chatPanelProvider: ChatPanelProvider;
let apiClient: ApiClient;
let localOptimizer: LocalOptimizer;

export function activate(context: vscode.ExtensionContext) {
  console.log('TokenTrim extension is now active');

  // Initialize components
  apiClient = new ApiClient(context);
  localOptimizer = new LocalOptimizer();
  chatPanelProvider = new ChatPanelProvider(context, apiClient, localOptimizer);

  // Register the webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'tokentrim.chatPanel',
      chatPanelProvider
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.openPanel', () => {
      vscode.commands.executeCommand('tokentrim.chatPanel.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.setApiKey', async () => {
      const choice = await vscode.window.showQuickPick(
        [
          { label: '🔑 Enter API Key', description: 'Use your TokenTrim subscription API key', value: 'api' },
          { label: '🧪 Local Mode (Demo)', description: 'Test locally without subscription', value: 'local' },
        ],
        { placeHolder: 'Choose how to use TokenTrim' }
      );

      if (!choice) return;

      if (choice.value === 'local') {
        await context.secrets.store('tokentrim.apiKey', 'tt_local');
        apiClient.setApiKey('tt_local');
        vscode.window.showInformationMessage('TokenTrim running in local mode! All optimization happens on your machine.');
        chatPanelProvider.updateApiKeyStatus(true);
        return;
      }

      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your TokenTrim API key',
        placeHolder: 'tt_xxxxxxxxxxxxxxxxxxxx',
        password: true,
        validateInput: (value) => {
          if (!value) {
            return 'API key is required';
          }
          if (!value.startsWith('tt_')) {
            return 'Invalid API key format. Should start with "tt_"';
          }
          if (value.length < 10) {
            return 'API key is too short';
          }
          return null;
        },
      });

      if (apiKey) {
        await context.secrets.store('tokentrim.apiKey', apiKey);
        apiClient.setApiKey(apiKey);
        vscode.window.showInformationMessage('TokenTrim API key saved successfully!');
        chatPanelProvider.updateApiKeyStatus(true);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.clearApiKey', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your API key?',
        'Yes',
        'No'
      );

      if (confirm === 'Yes') {
        await context.secrets.delete('tokentrim.apiKey');
        apiClient.setApiKey('');
        vscode.window.showInformationMessage('TokenTrim API key cleared.');
        chatPanelProvider.updateApiKeyStatus(false);
      }
    })
  );

  // Copy optimized prompt to clipboard (Ctrl+Shift+C)
  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.copyOptimized', async () => {
      const copied = await chatPanelProvider.copyOptimized();
      if (!copied) {
        vscode.window.showWarningMessage('No optimized prompt to copy. Type something in TokenTrim first.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokentrim.optimizeSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      try {
        const result = await apiClient.optimize(text);
        
        // Show result in a new document
        const doc = await vscode.workspace.openTextDocument({
          content: result.optimized,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: true,
        });

        vscode.window.showInformationMessage(
          `Optimized! Saved ${result.savings}% (${result.originalTokens} → ${result.optimizedTokens} tokens)`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Optimization failed: ${error.message}`);
      }
    })
  );

  // Load API key on startup
  context.secrets.get('tokentrim.apiKey').then((apiKey) => {
    if (apiKey) {
      apiClient.setApiKey(apiKey);
      chatPanelProvider.updateApiKeyStatus(true);
    }
  });

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get('tokentrim.hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        'Welcome to TokenTrim! Set your API key to start optimizing prompts.',
        'Set API Key',
        'Later'
      )
      .then((selection) => {
        if (selection === 'Set API Key') {
          vscode.commands.executeCommand('tokentrim.setApiKey');
        }
      });
    context.globalState.update('tokentrim.hasShownWelcome', true);
  }
}

export function deactivate() {
  console.log('TokenTrim extension deactivated');
}

