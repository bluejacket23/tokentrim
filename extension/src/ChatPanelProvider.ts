import * as vscode from 'vscode';
import { ApiClient } from './ApiClient';
import { LocalOptimizer } from './optimizer/LocalOptimizer';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tokentrim.chatPanel';
  
  private _view?: vscode.WebviewView;
  private _lastOptimizedText: string = '';
  private localOptimizer: LocalOptimizer;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly apiClient: ApiClient
  ) {
    this.localOptimizer = new LocalOptimizer();
  }

  // Copy the last optimized result to clipboard
  public async copyOptimized(): Promise<boolean> {
    if (this._lastOptimizedText) {
      await vscode.env.clipboard.writeText(this._lastOptimizedText);
      vscode.window.showInformationMessage('Optimized prompt copied!');
      this._view?.webview.postMessage({ type: 'showCopyFlash' });
      return true;
    }
    return false;
  }

  // Clear input
  public clearInput(): void {
    this._view?.webview.postMessage({ type: 'clearInput' });
  }

  // Update auth status in UI
  public updateAuthStatus(): void {
    if (!this._view) return;

    const isLoggedIn = this.apiClient.isLoggedIn();
    const session = this.apiClient.getSession();
    const status = this.apiClient.getSubscriptionStatus();

    this._view.webview.postMessage({
      type: 'authStatus',
      isLoggedIn,
      email: session?.email,
      name: session?.name,
      subscriptionStatus: status.status,
      subscriptionValid: status.valid,
      trialDaysRemaining: status.trialDaysRemaining,
      message: status.message,
    });
  }

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
          // Check if user can optimize - subscription required
          const status = this.apiClient.getSubscriptionStatus();
          if (!status.valid) {
            this._view?.webview.postMessage({
              type: 'blocked',
              message: status.message || 'Please sign in or subscribe to use TokenTrim.',
            });
            return;
          }

          try {
            const result = this.localOptimizer.optimize(data.text);
            this._lastOptimizedText = result.optimized;
            this._view?.webview.postMessage({
              type: 'result',
              result,
            });
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

        case 'login': {
          vscode.commands.executeCommand('tokentrim.login');
          break;
        }

        case 'logout': {
          vscode.commands.executeCommand('tokentrim.logout');
          break;
        }

        case 'subscribe': {
          vscode.commands.executeCommand('tokentrim.subscribe');
          break;
        }

      }
    });

    // Send initial auth status
    this.updateAuthStatus();
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
      --trim-green-dark: #16a34a;
      --bg-primary: var(--vscode-editor-background);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --input-bg: var(--vscode-input-background);
      --input-border: var(--vscode-input-border);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

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

    .auth-status {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .auth-status.signed-in {
      background: rgba(34, 197, 94, 0.2);
      color: var(--trim-green);
    }

    .auth-status.signed-out {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .auth-status.signed-out:hover {
      background: rgba(59, 130, 246, 0.3);
    }

    .auth-status.local {
      background: rgba(168, 85, 247, 0.2);
      color: #a855f7;
    }

    /* Warning banner */
    .warning-banner {
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 12px;
      font-size: 12px;
    }

    .warning-banner.error {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .warning-banner .title {
      font-weight: 600;
      margin-bottom: 4px;
      color: #eab308;
    }

    .warning-banner.error .title {
      color: #ef4444;
    }

    .warning-banner .message {
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .warning-banner button {
      background: #eab308;
      color: #000;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .warning-banner.error button {
      background: #ef4444;
      color: #fff;
    }

    /* Login prompt */
    .login-prompt {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      gap: 16px;
    }

    .login-prompt h3 {
      font-size: 16px;
      margin-bottom: 4px;
    }

    .login-prompt p {
      color: var(--text-secondary);
      font-size: 12px;
      max-width: 250px;
      line-height: 1.5;
    }

    .login-prompt .btn-login {
      background: var(--trim-green);
      color: #000;
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
    }

    .login-prompt .btn-login:hover {
      background: var(--trim-green-dark);
    }

    .login-prompt .link {
      font-size: 11px;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .login-prompt .link:hover {
      color: #a855f7;
    }

    /* Main content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .input-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }

    .label-row {
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

    .output-container.copied {
      animation: copyFlash 0.3s ease;
    }

    @keyframes copyFlash {
      0% { background: rgba(34, 197, 94, 0.3); }
      100% { background: var(--input-bg); }
    }

    .placeholder {
      color: var(--text-secondary);
      font-style: italic;
    }

    .error-msg {
      color: #ef4444;
      font-size: 12px;
      padding: 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
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
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">✂</div>
      <span>TokenTrim</span>
    </div>
    <div id="authStatus" class="auth-status signed-out" onclick="handleAuthClick()">
      Sign In
    </div>
  </div>

  <div id="warningBanner" class="warning-banner" style="display: none;">
    <div class="title" id="warningTitle"></div>
    <div class="message" id="warningMessage"></div>
    <button onclick="handleWarningAction()" id="warningButton">Subscribe</button>
  </div>

  <div id="loginPrompt" class="login-prompt">
    <h3>Welcome to TokenTrim ✂️</h3>
    <p>Optimize your prompts to save tokens and get better AI responses.</p>
    <button class="btn-login" onclick="handleLogin()">Sign In to Get Started</button>
  </div>

  <div id="mainContent" class="main-content" style="display: none;">
    <div class="input-section">
      <div class="label-row">
        <span>Your Prompt</span>
        <span class="token-count" id="inputTokens">~0 tokens</span>
      </div>
      <div class="textarea-container">
        <textarea 
          id="inputText" 
          placeholder="Type or paste your prompt here...&#10;&#10;TokenTrim will automatically optimize it."
        ></textarea>
      </div>
    </div>

    <div class="output-section">
      <div class="output-header">
        <div class="label-row">
          <span>Optimized</span>
          <span class="token-count" id="outputTokens">~0 tokens</span>
        </div>
        <span class="savings-badge" id="savings" style="display: none;">-0%</span>
      </div>
      <div class="output-container" id="outputText" tabindex="0">
        <span class="placeholder">Optimized prompt will appear here...</span>
      </div>
      <div class="copy-hint">Click to select • Ctrl+Shift+C copy • Ctrl+Shift+X clear</div>
      <div class="actions">
        <button class="btn-secondary" onclick="clearInput()">✕ Clear</button>
        <button class="btn-primary" onclick="copyToClipboard()">📋 Copy</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    let isLoggedIn = false;
    let subscriptionValid = false;
    let currentResult = null;
    let optimizeTimeout = null;

    const authStatus = document.getElementById('authStatus');
    const loginPrompt = document.getElementById('loginPrompt');
    const mainContent = document.getElementById('mainContent');
    const warningBanner = document.getElementById('warningBanner');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const inputTokens = document.getElementById('inputTokens');
    const outputTokens = document.getElementById('outputTokens');
    const savings = document.getElementById('savings');

    function estimateTokens(text) {
      if (!text) return 0;
      const hasCode = text.includes('\`\`\`') || text.includes('\`');
      return Math.ceil(text.length / (hasCode ? 3.5 : 4));
    }

    function updateUI() {
      // Only show main content if logged in AND has valid subscription
      if (isLoggedIn && subscriptionValid) {
        loginPrompt.style.display = 'none';
        mainContent.style.display = 'flex';
      } else {
        loginPrompt.style.display = 'flex';
        mainContent.style.display = 'none';
      }
    }

    // Input handling
    inputText.addEventListener('input', () => {
      const tokens = estimateTokens(inputText.value);
      inputTokens.textContent = '~' + tokens + ' tokens';

      if (optimizeTimeout) clearTimeout(optimizeTimeout);

      if (inputText.value.trim()) {
        optimizeTimeout = setTimeout(() => {
          vscode.postMessage({ type: 'optimize', text: inputText.value });
        }, 500);
      } else {
        outputText.innerHTML = '<span class="placeholder">Optimized prompt will appear here...</span>';
        outputTokens.textContent = '~0 tokens';
        savings.style.display = 'none';
      }
    });

    inputText.addEventListener('click', () => inputText.select());

    // Output handling
    outputText.addEventListener('click', () => {
      if (currentResult) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(outputText);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });

    // Message handling
    window.addEventListener('message', event => {
      const msg = event.data;

      switch (msg.type) {
        case 'authStatus':
          isLoggedIn = msg.isLoggedIn;
          subscriptionValid = msg.subscriptionValid || false;
          
          if (msg.isLoggedIn) {
            if (msg.subscriptionStatus === 'trialing' && msg.trialDaysRemaining) {
              authStatus.textContent = '✓ Trial (' + msg.trialDaysRemaining + 'd)';
            } else if (msg.subscriptionStatus === 'active') {
              authStatus.textContent = '✓ Pro';
            } else {
              authStatus.textContent = '⚠️ ' + (msg.email || 'Signed In');
            }
            authStatus.className = 'auth-status signed-in';
            
            // Show warning if needed
            if (!msg.subscriptionValid) {
              warningBanner.style.display = 'block';
              warningBanner.className = 'warning-banner error';
              document.getElementById('warningTitle').textContent = '🚫 Subscription Required';
              document.getElementById('warningMessage').textContent = msg.message || 'Please subscribe to continue.';
              document.getElementById('warningButton').textContent = 'Subscribe Now';
            } else if (msg.trialDaysRemaining && msg.trialDaysRemaining <= 2) {
              warningBanner.style.display = 'block';
              warningBanner.className = 'warning-banner';
              document.getElementById('warningTitle').textContent = '⚠️ Trial Ending Soon';
              document.getElementById('warningMessage').textContent = 'Your trial ends in ' + msg.trialDaysRemaining + ' day(s).';
              document.getElementById('warningButton').textContent = 'Subscribe Now';
            } else {
              warningBanner.style.display = 'none';
            }
          } else {
            authStatus.textContent = 'Sign In';
            authStatus.className = 'auth-status signed-out';
            warningBanner.style.display = 'none';
          }
          
          updateUI();
          break;

        case 'result':
          currentResult = msg.result;
          outputText.textContent = msg.result.optimized;
          outputTokens.textContent = '~' + msg.result.optimizedTokens + ' tokens';
          savings.textContent = '-' + msg.result.savings + '%';
          savings.style.display = 'inline';
          break;

        case 'blocked':
          warningBanner.style.display = 'block';
          warningBanner.className = 'warning-banner error';
          document.getElementById('warningTitle').textContent = '🚫 Access Required';
          document.getElementById('warningMessage').textContent = msg.message;
          outputText.innerHTML = '<div class="error-msg">' + msg.message + '</div>';
          break;

        case 'error':
          outputText.innerHTML = '<div class="error-msg">' + msg.message + '</div>';
          break;

        case 'showCopyFlash':
          outputText.classList.add('copied');
          setTimeout(() => outputText.classList.remove('copied'), 300);
          break;

        case 'clearInput':
          clearInput();
          break;
      }
    });

    function handleAuthClick() {
      if (isLoggedIn) {
        vscode.postMessage({ type: 'logout' });
      } else {
        vscode.postMessage({ type: 'login' });
      }
    }

    function handleLogin() {
      vscode.postMessage({ type: 'login' });
    }


    function handleWarningAction() {
      vscode.postMessage({ type: 'subscribe' });
    }

    function copyToClipboard() {
      if (currentResult) {
        vscode.postMessage({ type: 'copy', text: currentResult.optimized });
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyToClipboard();
      }
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
