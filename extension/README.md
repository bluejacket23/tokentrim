# TokenTrim - VS Code Extension

Optimize your AI prompts in real-time. Reduce token costs and get better LLM responses.

## Features

### 🔧 Real-time Prompt Optimization
As you type your prompt, TokenTrim analyzes and optimizes it in real-time:
- **Fluff Removal**: Eliminates filler words and redundant phrases
- **Deduplication**: Removes repeated information and code blocks
- **Constraint Extraction**: Identifies key requirements and tech stack
- **Intent Detection**: Understands your core ask and restructures accordingly
- **Code Preservation**: Keeps important code intact while trimming noise

### 📊 Token Counting
See exactly how many tokens you're saving:
- Live token count for original and optimized versions
- Percentage savings displayed prominently
- Estimated cost savings based on typical LLM pricing

### 📋 Easy Integration
- **Copy to Clipboard**: One-click copy of optimized prompt
- **Insert to Editor**: Directly insert optimized text into your active editor
- **Keyboard Shortcuts**: Quick access via `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "TokenTrim"
4. Click Install

### From Cursor
1. Open Cursor
2. Go to Extensions
3. Search for "TokenTrim"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from releases
2. In VS Code, go to Extensions
3. Click the `...` menu → Install from VSIX
4. Select the downloaded file

## Setup

### 1. Get Your API Key
1. Go to [tokentrim.com](https://tokentrim.com)
2. Sign up or log in
3. Subscribe to get access ($3.99/month)
4. Copy your API key from the dashboard

### 2. Configure the Extension
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `TokenTrim: Set API Key`
3. Paste your API key
4. You're ready to go!

## Usage

### Opening the Panel
- Click the TokenTrim icon in the sidebar (scissors icon)
- Or use keyboard shortcut: `Ctrl+Shift+T` / `Cmd+Shift+T`
- Or run command: `TokenTrim: Open Panel`

### Optimizing a Prompt
1. Open the TokenTrim panel
2. Type or paste your prompt in the input area
3. Watch the optimized version appear in real-time
4. Click **Copy** to copy the optimized prompt
5. Or click **Insert** to insert it into your active editor

### Optimizing Selected Text
1. Select text in any editor
2. Right-click → "TokenTrim: Optimize Selection"
3. Or use shortcut: `Ctrl+Alt+O` / `Cmd+Alt+O`

## Configuration

Open VS Code Settings and search for "TokenTrim" to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| `tokentrim.apiUrl` | `https://api.tokentrim.com` | API endpoint URL |
| `tokentrim.autoOptimize` | `true` | Auto-optimize as you type |
| `tokentrim.optimizeDelay` | `500` | Delay (ms) before auto-optimization |
| `tokentrim.showTokenCount` | `true` | Show token counts in panel |

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Open TokenTrim Panel |
| `Ctrl+Alt+O` / `Cmd+Alt+O` | Optimize Selection |

## How It Works

TokenTrim uses a multi-stage optimization pipeline:

1. **Normalize**: Standardizes formatting and whitespace
2. **Extract Code**: Preserves code blocks separately
3. **Remove Fluff**: Eliminates filler words and emotional language
4. **Deduplicate**: Removes repeated information
5. **Extract Metadata**: Identifies tech stack, requirements, constraints
6. **Detect Intent**: Classifies the prompt type (bug fix, implementation, etc.)
7. **Restructure**: Formats for optimal LLM consumption

## Optimization Examples

### Before
```
Hey so I have this really annoying bug that I've been trying to fix for like 
hours now and I'm getting super frustrated. Basically what's happening is that 
when I click the submit button on my form it's supposed to send the data to my 
API endpoint but instead nothing happens at all...
```

### After
```
**Bug Fix Request**

Form submit button not sending data to API endpoint.

**Stack**: React, API
**Need**: Fix form submission to API
```

**Result**: 312 tokens → 89 tokens (71% reduction)

## Privacy & Security

- Your prompts are sent to our secure API for optimization
- We don't store your prompt content
- API keys are stored securely in VS Code's secret storage
- All communication is encrypted via HTTPS

## Troubleshooting

### "Invalid API key" error
- Make sure you've subscribed at tokentrim.com
- Check that your API key is correct (starts with `tt_`)
- Try clearing and re-entering your API key

### Extension not loading
- Restart VS Code
- Check the Output panel for errors (View → Output → TokenTrim)

### Optimization not working
- Check your internet connection
- Verify your subscription is active
- Check the API status at status.tokentrim.com

## Support

- 📧 Email: support@tokentrim.com
- 🐛 Issues: [GitHub Issues](https://github.com/tokentrim/tokentrim-vscode/issues)
- 📚 Docs: [tokentrim.com/docs](https://tokentrim.com/docs)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ✂️ by the TokenTrim team













