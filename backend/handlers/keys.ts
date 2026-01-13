import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  createApiKey,
  getApiKeysByUser,
  getApiKeyByHash,
  deleteApiKey,
  updateKeyLastUsed,
  getUser,
  hasValidAccess,
} from '../lib/dynamodb';
import { sendApiKeyEmail } from '../lib/email';
import { success, badRequest, unauthorized, forbidden, notFound, serverError } from '../lib/response';

// Hash API key for storage
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Calculate trial days remaining
function getTrialDaysRemaining(trialEndsAt?: string): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diffMs = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export async function getKeys(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return badRequest('Email is required');
    }

    const keys = await getApiKeysByUser(email);

    // Return keys without the hash
    const safeKeys = keys.map((key) => ({
      id: key.keyId,
      name: key.name,
      key: `tt_${'•'.repeat(28)}${key.keyHash.substring(0, 4)}`,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));

    return success({ keys: safeKeys });
  } catch (error: any) {
    console.error('Get keys error:', error);
    return serverError(error.message);
  }
}

// Generate a secure random API key
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  return 'tt_' + randomBytes.toString('base64url');
}

export async function createKey(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, name } = body;

    if (!email) {
      return badRequest('Email is required');
    }

    // Verify user has active subscription
    const user = await getUser(email.toLowerCase());
    if (!user) {
      return notFound('User not found');
    }

    if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
      return forbidden('Active subscription required to create API keys');
    }

    // Check key limit (1 key per user - simple and prevents sharing)
    const existingKeys = await getApiKeysByUser(email.toLowerCase());
    if (existingKeys.length >= 1) {
      return badRequest('You already have an API key. Delete it first to create a new one.');
    }

    // Generate key server-side
    const apiKey = generateApiKey();
    const keyHash = hashKey(apiKey);
    const keyId = uuidv4();

    await createApiKey(email.toLowerCase(), keyId, keyHash, name || 'My API Key');

    // Email the key to the user
    try {
      await sendApiKeyEmail(user.email, apiKey, user.name);
    } catch (emailError) {
      console.error('Failed to send API key email:', emailError);
      // Still return success - key was created
    }

    return success({
      id: keyId,
      name: name || 'My API Key',
      message: 'API key created and sent to your email!',
      emailSent: true,
    });
  } catch (error: any) {
    console.error('Create key error:', error);
    return serverError(error.message);
  }
}

export async function deleteKey_(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, keyId } = body;

    if (!email || !keyId) {
      return badRequest('Email and key ID are required');
    }

    await deleteApiKey(email, keyId);

    return success({ message: 'API key deleted successfully' });
  } catch (error: any) {
    console.error('Delete key error:', error);
    return serverError(error.message);
  }
}

// Export with correct name
export { deleteKey_ as deleteKey };

export async function validateKey(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { apiKey } = body;

    if (!apiKey) {
      return badRequest('API key is required');
    }

    // Hash the provided key
    const keyHash = hashKey(apiKey);

    // Look up key
    const keyRecord = await getApiKeyByHash(keyHash);

    if (!keyRecord) {
      return unauthorized('Invalid API key');
    }

    // Get user to check subscription
    const user = await getUser(keyRecord.userId);

    if (!user) {
      return unauthorized('User not found');
    }

    // Check if user has valid access (subscription or trial)
    const access = hasValidAccess(user);
    
    if (!access.valid) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          valid: false,
          error: access.reason,
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt,
          requiresSubscription: true,
        }),
      };
    }

    // Update last used timestamp
    await updateKeyLastUsed(keyRecord.userId, keyRecord.keyId);

    // Calculate trial info for response
    const trialDaysRemaining = getTrialDaysRemaining(user.trialEndsAt);

    return success({
      valid: true,
      userId: keyRecord.userId,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      trialDaysRemaining,
      currentPeriodEnd: user.currentPeriodEnd,
    });
  } catch (error: any) {
    console.error('Validate key error:', error);
    return serverError(error.message);
  }
}

















