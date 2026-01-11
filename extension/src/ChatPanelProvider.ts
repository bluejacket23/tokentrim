import * as vscode from 'vscode';
import { ApiClient } from './ApiClient';
import { LocalOptimizer } from './optimizer/LocalOptimizer';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _hasApiKey: boolean = false;
  private _lastOptimizedText: string = '';

  // Copy the last optimized result to clipboard
  public async copyOptimized(): Promise<boolean> {
    if (this._lastOptimizedText) {
      await vscode.env.clipboard.writeText(this._lastOptimizedText);
      vscode.window.showInformationMessage('Optimized prompt copied!');
      // Tell webview to show flash animation
      this._view?.webview.postMessage({ type: 'showCopyFlash' });
      return true;
    }
    return false;
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly apiClient: ApiClient,
    private readonly localOptimizer: LocalOptimizer
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'optimize': {
          try {
            // Use local optimization - works offline!
            const localResult = this.localOptimizer.optimize(data.text);
            this._lastOptimizedText = localResult.optimized;
            this._view?.webview.postMessage({
              type: 'localResult',
              result: localResult,
            });

            // Only try server if API key is set AND not in local mode
            if (this.apiClient.hasApiKey() && !this.apiClient.isLocalMode()) {
              try {
                const serverResult = await this.apiClient.optimize(data.text);
                this._view?.webview.postMessage({
                  type: 'serverResult',
                  result: serverResult,
                });
              } catch (serverError: any) {
                // Silently fall back to local result if server fails
                console.log('Server optimization failed, using local result:', serverError.message);
              }
            }
          } catch (error: any) {
            this._view?.webview.postMessage({
              type: 'error',
              message: error.message,
            });
          }
          break;
        }

        case 'copy': {
          await vscode.env.clipboard.writeText(data.text);
          vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
          break;
        }

        case 'setApiKey': {
          vscode.commands.executeCommand('tokentrim.setApiKey');
          break;
        }

      }
    });

    // Update API key status
    this._view.webview.postMessage({
      type: 'apiKeyStatus',
      hasApiKey: this._hasApiKey,
      isLocalMode: this.apiClient.isLocalMode(),
    });
  }

  public updateApiKeyStatus(hasApiKey: boolean) {
    this._hasApiKey = hasApiKey;
    if (this._view) {
      this._view.webview.postMessage({
        type: 'apiKeyStatus',
        hasApiKey,
        isLocalMode: this.apiClient.isLocalMode(),
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TokenTrim</title>
  <style>
    :root {
      --trim-green: #22c55e;
      --trim-green-light: #4ade80;
      --trim-green-dark: #16a34a;
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --input-bg: var(--vscode-input-background);
      --input-border: var(--vscode-input-border);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 12px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    .logo-icon {
      width: 20px;
      height: 20px;
      background: var(--trim-green);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      font-size: 12px;
    }

    .api-status {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
      cursor: pointer;
    }

    .api-status.connected {
      background: rgba(34, 197, 94, 0.2);
      color: var(--trim-green);
    }

    .api-status.disconnected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .input-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }

    .input-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .token-count {
      font-family: monospace;
      color: var(--trim-green);
    }

    .textarea-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100px;
    }

    textarea {
      flex: 1;
      width: 100%;
      padding: 12px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.5;
      resize: none;
    }

    textarea:focus {
      outline: none;
      border-color: var(--trim-green);
    }

    .output-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .output-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .savings-badge {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(34, 197, 94, 0.2);
      color: var(--trim-green);
      font-weight: 600;
    }

    .savings-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .output-container {
      flex: 1;
      background: var(--input-bg);
      border: 1px solid var(--trim-green);
      border-radius: 6px;
      padding: 12px;
      overflow-y: auto;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      min-height: 100px;
      cursor: text;
      user-select: text;
    }

    .output-container:focus {
      outline: 2px solid var(--trim-green);
      outline-offset: -2px;
    }

    .output-container.copied {
      animation: copyFlash 0.3s ease;
    }

    @keyframes copyFlash {
      0% { background: rgba(34, 197, 94, 0.3); }
      100% { background: var(--input-bg); }
    }

    .copy-hint {
      font-size: 10px;
      color: var(--text-secondary);
      text-align: center;
      margin-top: 4px;
      opacity: 0.7;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    button {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--trim-green);
      color: #000;
    }

    .btn-primary:hover {
      background: var(--trim-green-dark);
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      border-color: var(--trim-green);
      color: var(--trim-green);
    }

    .placeholder {
      color: var(--text-secondary);
      font-style: italic;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--border);
      border-top-color: var(--trim-green);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      color: #ef4444;
      font-size: 12px;
      padding: 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
    }

    .no-api-key {
      text-align: center;
      padding: 24px;
      color: var(--text-secondary);
    }

    .no-api-key button {
      margin-top: 12px;
    }

    /* Intent badge */
    .intent-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(34, 197, 94, 0.1);
      color: var(--trim-green);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">✂</div>
      <span>TokenTrim</span>
    </div>
    <div id="apiStatus" class="api-status disconnected" onclick="setApiKey()">
      Click to Setup
    </div>
  </div>

  <div class="input-section">
    <div class="input-label">
      <span>Your Prompt</span>
      <span class="token-count" id="inputTokens">~0 tokens</span>
    </div>
    <div class="textarea-container">
      <textarea 
        id="inputText" 
        placeholder="Type or paste your prompt here...&#10;&#10;TokenTrim will automatically optimize it to reduce tokens and improve clarity."
      ></textarea>
    </div>
  </div>

  <div class="output-section">
    <div class="output-header">
      <div class="input-label">
        <span>Optimized </span>
        <span class="token-count" id="outputTokens">~0 tokens</span>
      </div>
      <div class="savings-row">
        <span class="savings-badge" id="savings" style="display: none;">-0%</span>
      </div>
    </div>
    <div class="output-container" id="outputText" tabindex="0">
      <span class="placeholder">Optimized prompt will appear here...</span>
    </div>
    <div class="copy-hint" id="copyHint">Click to select • Ctrl+Shift+C copy • Ctrl+Shift+X clear</div>
    <div class="actions">
      <button class="btn-secondary" onclick="clearInput()" title="Clear input (Ctrl+Shift+X)">
        ✕ Clear
      </button>
      <button class="btn-primary" onclick="copyToClipboard()">
        📋 Copy
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    let hasApiKey = false;
    let optimizeTimeout = null;
    let currentResult = null;

    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const inputTokens = document.getElementById('inputTokens');
    const outputTokens = document.getElementById('outputTokens');
    const savings = document.getElementById('savings');
    const apiStatus = document.getElementById('apiStatus');

    // Estimate tokens locally
    function estimateTokens(text) {
      if (!text) return 0;
      const hasCode = text.includes('\`\`\`') || text.includes('\`');
      const multiplier = hasCode ? 3.5 : 4;
      return Math.ceil(text.length / multiplier);
    }

    // Update input token count
    inputText.addEventListener('input', () => {
      const tokens = estimateTokens(inputText.value);
      inputTokens.textContent = '~' + tokens + ' tokens';

      // Debounce optimization
      if (optimizeTimeout) {
        clearTimeout(optimizeTimeout);
      }

      if (inputText.value.trim()) {
        optimizeTimeout = setTimeout(() => {
          vscode.postMessage({
            type: 'optimize',
            text: inputText.value
          });
        }, 500);
      } else {
        outputText.innerHTML = '<span class="placeholder">Optimized prompt will appear here...</span>';
        outputTokens.textContent = '~0 tokens';
        savings.style.display = 'none';
      }
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.type) {
        case 'localResult':
        case 'serverResult':
          currentResult = message.result;
          outputText.textContent = message.result.optimized;
          outputTokens.textContent = '~' + message.result.optimizedTokens + ' tokens';
          savings.textContent = '-' + message.result.savings + '%';
          savings.style.display = 'inline';
          break;

        case 'error':
          outputText.innerHTML = '<div class="error">' + message.message + '</div>';
          break;

        case 'apiKeyStatus':
          hasApiKey = message.hasApiKey;
          if (hasApiKey) {
            apiStatus.textContent = message.isLocalMode ? '🧪 Local Mode' : '✓ Connected';
            apiStatus.classList.remove('disconnected');
            apiStatus.classList.add('connected');
          } else {
            apiStatus.textContent = 'Click to Setup';
            apiStatus.classList.remove('connected');
            apiStatus.classList.add('disconnected');
          }
          break;

        case 'showCopyFlash':
          outputText.classList.add('copied');
          setTimeout(() => outputText.classList.remove('copied'), 300);
          break;
      }
    });

    function copyToClipboard() {
      if (currentResult) {
        vscode.postMessage({
          type: 'copy',
          text: currentResult.optimized
        });
        // Visual feedback
        outputText.classList.add('copied');
        setTimeout(() => outputText.classList.remove('copied'), 300);
      }
    }

    function clearInput() {
      inputText.value = '';
      inputTokens.textContent = '~0 tokens';
      outputText.innerHTML = '<span class="placeholder">Optimized prompt will appear here...</span>';
      outputTokens.textContent = '~0 tokens';
      savings.style.display = 'none';
      currentResult = null;
      inputText.focus();
    }

    function setApiKey() {
      vscode.postMessage({ type: 'setApiKey' });
    }

    // Click to select all text in output
    outputText.addEventListener('click', () => {
      if (currentResult) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(outputText);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });

    // Click to select all text in input
    inputText.addEventListener('click', () => {
      inputText.select();
    });

    // Keyboard shortcut: Ctrl+C when output is focused
    outputText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Let native copy work since text is selected
        // But also copy via extension for notification
        if (currentResult) {
          vscode.postMessage({
            type: 'copy',
            text: currentResult.optimized
          });
          outputText.classList.add('copied');
          setTimeout(() => outputText.classList.remove('copied'), 300);
        }
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+C to copy optimized
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyToClipboard();
      }
      // Ctrl+Shift+X to clear input
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        clearInput();
      }
    });
  </script>
</body>
</html>`;
  }
}

