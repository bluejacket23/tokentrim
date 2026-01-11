# TokenTrim 🔧✨

**Optimize your AI prompts, reduce token costs, get better results.**

TokenTrim is a SaaS platform + VS Code/Cursor extension that helps developers write more efficient prompts for AI coding assistants. It analyzes your input in real-time, removes fluff, deduplicates content, extracts key constraints, and produces concise, optimized prompts that save tokens and improve LLM responses.

## 🏗️ Project Structure

```
tokentrim/
├── web/                    # Next.js SaaS application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utilities and configs
├── backend/               # AWS Serverless backend
│   ├── handlers/         # Lambda function handlers
│   └── serverless.yml    # Serverless Framework config
└── extension/            # VS Code/Cursor extension
    ├── src/              # Extension source code
    └── webview/          # Chat panel UI
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Stripe account
- Google Cloud Console project (for OAuth)

### 1. Web Application

```bash
cd web
npm install
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

### 2. Backend Deployment

```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables
npx serverless deploy
```

### 3. VS Code Extension

```bash
cd extension
npm install
npm run compile
# Press F5 in VS Code to launch extension development host
```

## 🔑 Environment Variables

### Web App (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

### Backend (.env)
```
DYNAMODB_TABLE=tokentrim-users
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 💰 Pricing

$3.99/month for unlimited prompt optimization

## 📦 Features

### Landing Page
- Clean, modern design explaining the product
- Token savings calculator
- Feature highlights
- Pricing section

### Dashboard
- API key management
- Usage statistics
- Subscription management

### VS Code Extension
- Real-time prompt optimization
- Side-by-side comparison view
- One-click copy to clipboard
- Token count estimation
- Multiple optimization strategies

## 🔧 Optimization Techniques

1. **Normalize** - Standardize text formatting and structure
2. **Remove Fluff** - Eliminate filler words and redundant phrases
3. **Deduplicate** - Remove repeated code blocks and information
4. **Extract Constraints** - Identify and highlight key requirements
5. **Detect Intent** - Understand the core ask
6. **Reshape** - Restructure for optimal LLM consumption
7. **Token Estimation** - Real-time token counting

## 📄 License

MIT License - see LICENSE file for details













