import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@tokentrim.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@tokentrim.com';

/**
 * Send API key to user via email
 */
export async function sendApiKeyEmail(to: string, apiKey: string, name?: string): Promise<void> {
  const subject = 'Your TokenTrim API Key';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #22c55e; }
    .key-box { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .key { font-family: monospace; font-size: 14px; color: #22c55e; word-break: break-all; background: #18181b; padding: 12px; border-radius: 6px; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin: 20px 0; font-size: 14px; }
    .steps { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .steps h3 { margin-top: 0; color: #16a34a; }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin: 8px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✂️ TokenTrim</div>
    </div>
    
    <p>Hi${name ? ` ${name}` : ''},</p>
    
    <p>Here's your TokenTrim API key:</p>
    
    <div class="key-box">
      <div class="key">${apiKey}</div>
    </div>
    
    <div class="warning">
      ⚠️ <strong>Keep this key private!</strong> Don't share it with anyone. This key is tied to your subscription.
    </div>
    
    <div class="steps">
      <h3>Quick Setup</h3>
      <ol>
        <li>Install the TokenTrim extension in VS Code or Cursor</li>
        <li>Open Command Palette (Ctrl/Cmd + Shift + P)</li>
        <li>Run "TokenTrim: Set API Key"</li>
        <li>Paste your key and start optimizing!</li>
      </ol>
    </div>
    
    <p>Need help? Reply to this email or visit our <a href="https://tokentrim.com">website</a>.</p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} TokenTrim. All rights reserved.</p>
      <p>You're receiving this because you created an API key at tokentrim.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
TokenTrim API Key
=================

Hi${name ? ` ${name}` : ''},

Here's your TokenTrim API key:

${apiKey}

⚠️ Keep this key private! Don't share it with anyone. This key is tied to your subscription.

Quick Setup:
1. Install the TokenTrim extension in VS Code or Cursor
2. Open Command Palette (Ctrl/Cmd + Shift + P)
3. Run "TokenTrim: Set API Key"
4. Paste your key and start optimizing!

Need help? Reply to this email or visit https://tokentrim.com

© ${new Date().getFullYear()} TokenTrim
  `.trim();

  await ses.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [SUPPORT_EMAIL],
    })
  );
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(to: string, name?: string, trialDays: number = 7): Promise<void> {
  const subject = 'Welcome to TokenTrim! 🎉';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #22c55e; }
    .trial-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .trial-days { font-size: 48px; font-weight: bold; color: #22c55e; }
    .cta { display: inline-block; background: #22c55e; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✂️ TokenTrim</div>
    </div>
    
    <p>Hi${name ? ` ${name}` : ''},</p>
    
    <p>Welcome to TokenTrim! Your account is ready.</p>
    
    <div class="trial-box">
      <div class="trial-days">${trialDays}</div>
      <div>days free trial</div>
    </div>
    
    <p>Get started by creating your API key in the dashboard:</p>
    
    <p style="text-align: center;">
      <a href="https://tokentrim.com/dashboard" class="cta">Go to Dashboard →</a>
    </p>
    
    <p>TokenTrim helps you write cleaner prompts that get better results from AI. Every token saved is money saved!</p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} TokenTrim. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Welcome to TokenTrim! 🎉
========================

Hi${name ? ` ${name}` : ''},

Welcome to TokenTrim! Your account is ready.

You have ${trialDays} days of free trial.

Get started by creating your API key: https://tokentrim.com/dashboard

TokenTrim helps you write cleaner prompts that get better results from AI. Every token saved is money saved!

© ${new Date().getFullYear()} TokenTrim
  `.trim();

  await ses.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [SUPPORT_EMAIL],
    })
  );
}






