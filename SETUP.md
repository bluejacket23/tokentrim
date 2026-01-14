# TokenTrim - Complete Setup Guide

This guide walks you through setting up the entire TokenTrim platform from scratch.

## Prerequisites

Before starting, make sure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **AWS CLI** - [Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS Account** - [Sign up](https://aws.amazon.com/)
- **Stripe Account** - [Sign up](https://stripe.com/)
- **Google Cloud Console Account** - [Sign up](https://console.cloud.google.com/)

## Step 1: AWS Configuration

### 1.1 Configure AWS CLI

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, and preferred region (e.g., `us-east-1`).

### 1.2 Create IAM User (Optional but Recommended)

For security, create a dedicated IAM user for TokenTrim:

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach these policies:
   - `AmazonDynamoDBFullAccess`
   - `AWSLambdaFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `CloudWatchLogsFullAccess`

## Step 2: Stripe Configuration

### 2.1 Create Product and Price

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Products
2. Click "Add Product"
3. **Name**: TokenTrim Pro
4. **Price**: $3.99/month (recurring)
5. Save and copy the **Price ID** (starts with `price_`)

### 2.2 Get API Keys

1. Go to Developers → API Keys
2. Copy your **Publishable key** (`pk_test_...`)
3. Copy your **Secret key** (`sk_test_...`)

### 2.3 Set up Webhook (After Backend Deployment)

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-api-gateway-url/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (`whsec_...`)

## Step 3: Google OAuth Configuration

### 3.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google+ API
4. Go to APIs & Services → Credentials
5. Click "Create Credentials" → OAuth Client ID
6. Application type: Web application
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
8. Copy **Client ID** and **Client Secret**

## Step 4: Deploy Backend

### 4.1 Install Dependencies

```bash
cd backend
npm install
```

### 4.2 Create Environment File

```bash
cp env.example .env
```

Edit `.env` with your values:

```env
JWT_SECRET=generate-a-random-32-character-string
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4.3 Deploy to AWS

```bash
# Development
npm run deploy

# Production
npm run deploy:prod
```

After deployment, note the API Gateway URL from the output (looks like `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev`).

### 4.4 Verify Deployment

```bash
# Test the health endpoint
curl https://your-api-url/dev/health
```

## Step 5: Configure Web Application

### 5.1 Install Dependencies

```bash
cd web
npm install
```

### 5.2 Create Environment File

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-gateway-url/dev

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_SECRET=generate-another-random-32-character-string
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID=price_your_price_id
```

### 5.3 Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5.4 Test the Flow

1. Visit the landing page
2. Click "Get Started" or "Sign In"
3. Create an account or sign in with Google
4. Complete subscription (use Stripe test card: `4242 4242 4242 4242`)
5. Generate an API key in the dashboard

## Step 6: Build VS Code Extension

### 6.1 Install Dependencies

```bash
cd extension
npm install
```

### 6.2 Compile Extension

```bash
npm run compile
```

### 6.3 Test Extension

1. Open the `extension` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open Command Palette (`Ctrl+Shift+P`)
4. Run "TokenTrim: Set API Key"
5. Enter your API key from the dashboard
6. Open the TokenTrim panel and test optimization

### 6.4 Package Extension (Optional)

```bash
npm run package
```

This creates a `.vsix` file that can be installed manually or published to the marketplace.

## Step 7: Production Deployment

### 7.1 Deploy Backend to Production

```bash
cd backend
npm run deploy:prod
```

### 7.2 Deploy Web Application

For Vercel:
```bash
cd web
npm install -g vercel
vercel
```

For AWS Amplify:
1. Push code to GitHub
2. Connect repo in AWS Amplify Console
3. Configure environment variables
4. Deploy

### 7.3 Update Environment Variables

Update all URLs to production values:
- Update `NEXT_PUBLIC_API_URL` in web app
- Update `NEXTAUTH_URL` to your production domain
- Add production URLs to Google OAuth authorized origins
- Update Stripe webhook URL

### 7.4 Publish VS Code Extension

1. Create a publisher at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Get a Personal Access Token
3. Update `publisher` in `extension/package.json`
4. Run:
```bash
npm run publish
```

## Environment Variable Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for signing JWTs | `random-32-char-string` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |

### Web App (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://xxx.execute-api.us-east-1.amazonaws.com/dev` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | `random-32-char-string` |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Price ID for subscription | `price_...` |

## Troubleshooting

### DynamoDB Table Not Created

If the table isn't created automatically:
1. Check CloudFormation events in AWS Console
2. Manually create with the schema in `serverless.yml`

### CORS Errors

1. Check the `httpApi.cors` settings in `serverless.yml`
2. Add your domain to allowed origins
3. Redeploy backend

### OAuth Redirect Errors

1. Verify redirect URIs in Google Cloud Console
2. Make sure `NEXTAUTH_URL` matches exactly
3. Check for trailing slashes

### Stripe Webhook Failures

1. Check Stripe Dashboard → Developers → Webhooks → Logs
2. Verify webhook URL is correct
3. Check signature secret matches

### Extension Not Connecting

1. Verify API key is set correctly
2. Check network connectivity
3. Look in Output panel (View → Output → TokenTrim)

## Support

If you encounter issues:

1. Check this setup guide
2. Review error logs in AWS CloudWatch
3. Open an issue on GitHub
4. Contact support@tokentrim.com

---

Happy coding! 🎉
























