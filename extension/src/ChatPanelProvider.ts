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

  public async copyOptimized(): Promise<boolean> {
    if (this._lastOptimizedText) {
      await vscode.env.clipboard.writeText(this._lastOptimizedText);
      vscode.window.showInformationMessage('Optimized prompt copied!');
      this._view?.webview.postMessage({ type: 'showCopyFlash' });
      return true;
    }
    return false;
  }

  public clearInput(): void {
    this._view?.webview.postMessage({ type: 'clearInput' });
  }

  public updateLicenseStatus(): void {
    if (!this._view) return;

    const hasKey = this.apiClient.hasLicenseKey();
    const info = this.apiClient.getLicenseInfo();

    this._view.webview.postMessage({
      type: 'licenseStatus',
      hasKey,
      valid: info?.valid || false,
      email: info?.email,
      name: info?.name,
      subscriptionStatus: info?.subscriptionStatus,
      trialDaysRemaining: info?.trialDaysRemaining,
      message: info?.message,
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

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'optimize': {
          const info = this.apiClient.getLicenseInfo();
          if (!info?.valid) {
            this._view?.webview.postMessage({
              type: 'blocked',
              message: info?.message || 'Please enter a valid license key.',
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
          vscode.window.showInformationMessage('Optimized prompt copied!');
          break;
        }

        case 'setLicenseKey': {
          vscode.commands.executeCommand('tokentrim.setLicenseKey');
          break;
        }

        case 'submitLicenseKey': {
          const result = await this.apiClient.validateLicenseKey(data.key);
          if (result.valid) {
            this.updateLicenseStatus();
            vscode.window.showInformationMessage('License key activated!');
          } else {
            this._view?.webview.postMessage({
              type: 'licenseError',
              message: result.message || 'Invalid license key',
            });
          }
          break;
        }

        case 'clearLicenseKey': {
          vscode.commands.executeCommand('tokentrim.clearLicenseKey');
          break;
        }

        case 'subscribe': {
          vscode.commands.executeCommand('tokentrim.subscribe');
          break;
        }
      }
    });

    this.updateLicenseStatus();
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

    .status-badge {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .status-badge.active {
      background: rgba(34, 197, 94, 0.2);
      color: var(--trim-green);
    }

    .status-badge.inactive {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    /* License Key Prompt */
    .license-prompt {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      gap: 16px;
    }

    .license-prompt h3 {
      font-size: 16px;
      margin-bottom: 4px;
    }

    .license-prompt p {
      color: var(--text-secondary);
      font-size: 12px;
      max-width: 280px;
      line-height: 1.5;
    }

    .license-input-group {
      width: 100%;
      max-width: 280px;
    }

    .license-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: monospace;
      font-size: 13px;
      text-align: center;
      letter-spacing: 1px;
    }

    .license-input:focus {
      outline: none;
      border-color: var(--trim-green);
    }

    .license-input::placeholder {
      letter-spacing: normal;
      font-family: var(--vscode-font-family);
    }

    .license-error {
      color: #ef4444;
      font-size: 11px;
      margin-top: 8px;
    }

    .btn-activate {
      width: 100%;
      max-width: 280px;
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

    .btn-activate:hover {
      background: var(--trim-green-dark);
    }

    .btn-activate:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .license-prompt .link {
      font-size: 11px;
      color: var(--trim-green);
      cursor: pointer;
      text-decoration: underline;
      margin-top: 8px;
    }

    .license-prompt .link:hover {
      color: var(--trim-green-dark);
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
    <div id="statusBadge" class="status-badge inactive">
      No License
    </div>
  </div>

  <div id="licensePrompt" class="license-prompt">
    <h3>Welcome to TokenTrim ✂️</h3>
    <p>Enter your license key to start optimizing prompts and saving tokens.</p>
    
    <div class="license-input-group">
      <input 
        type="text" 
        id="licenseInput" 
        class="license-input" 
        placeholder="TT-XXXX-XXXX-XXXX"
        maxlength="17"
      />
      <div id="licenseError" class="license-error" style="display: none;"></div>
    </div>
    
    <button id="activateBtn" class="btn-activate" disabled>Activate</button>
    
    <span class="link" onclick="handleGetLicense()">Get a license key →</span>
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
      <div class="copy-hint">Click to select • Ctrl+Shift+C copy</div>
      <div class="actions">
        <button class="btn-secondary" onclick="clearInput()">✕ Clear</button>
        <button class="btn-primary" onclick="copyToClipboard()">📋 Copy</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    let isLicensed = false;
    let currentResult = null;
    let optimizeTimeout = null;

    const statusBadge = document.getElementById('statusBadge');
    const licensePrompt = document.getElementById('licensePrompt');
    const mainContent = document.getElementById('mainContent');
    const licenseInput = document.getElementById('licenseInput');
    const licenseError = document.getElementById('licenseError');
    const activateBtn = document.getElementById('activateBtn');
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
      if (isLicensed) {
        licensePrompt.style.display = 'none';
        mainContent.style.display = 'flex';
      } else {
        licensePrompt.style.display = 'flex';
        mainContent.style.display = 'none';
      }
    }

    // License input handling
    licenseInput.addEventListener('input', () => {
      let value = licenseInput.value.toUpperCase();
      // Auto-format: TT-XXXX-XXXX-XXXX
      value = value.replace(/[^A-Z0-9-]/g, '');
      licenseInput.value = value;
      
      const isValid = value.match(/^TT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      activateBtn.disabled = !isValid;
      licenseError.style.display = 'none';
    });

    activateBtn.addEventListener('click', () => {
      const key = licenseInput.value.trim();
      if (key) {
        activateBtn.disabled = true;
        activateBtn.textContent = 'Validating...';
        vscode.postMessage({ type: 'submitLicenseKey', key });
      }
    });

    licenseInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !activateBtn.disabled) {
        activateBtn.click();
      }
    });

    // Prompt input handling
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
        case 'licenseStatus':
          isLicensed = msg.valid;
          
          if (msg.valid) {
            if (msg.subscriptionStatus === 'trialing' && msg.trialDaysRemaining) {
              statusBadge.textContent = '✓ Trial (' + msg.trialDaysRemaining + 'd)';
            } else {
              statusBadge.textContent = '✓ Pro';
            }
            statusBadge.className = 'status-badge active';
          } else {
            statusBadge.textContent = 'No License';
            statusBadge.className = 'status-badge inactive';
          }
          
          updateUI();
          
          // Reset activate button
          activateBtn.disabled = false;
          activateBtn.textContent = 'Activate';
          break;

        case 'licenseError':
          licenseError.textContent = msg.message;
          licenseError.style.display = 'block';
          activateBtn.disabled = false;
          activateBtn.textContent = 'Activate';
          break;

        case 'result':
          currentResult = msg.result;
          outputText.textContent = msg.result.optimized;
          outputTokens.textContent = '~' + msg.result.optimizedTokens + ' tokens';
          savings.textContent = '-' + msg.result.savings + '%';
          savings.style.display = 'inline';
          break;

        case 'blocked':
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

    function handleGetLicense() {
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
