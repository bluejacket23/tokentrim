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
} from '../lib/dynamodb';
import { success, badRequest, unauthorized, forbidden, notFound, serverError } from '../lib/response';

// Hash API key for storage
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
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

export async function createKey(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, userId, name, key } = body;

    if (!email || !key) {
      return badRequest('Email and key are required');
    }

    // Verify user has active subscription
    const user = await getUser(email);
    if (!user) {
      return notFound('User not found');
    }

    if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
      return forbidden('Active subscription required to create API keys');
    }

    // Check key limit (max 3 per user)
    const existingKeys = await getApiKeysByUser(email);
    if (existingKeys.length >= 3) {
      return badRequest('Maximum 3 API keys allowed per account');
    }

    // Hash the key for storage
    const keyHash = hashKey(key);
    const keyId = uuidv4();

    await createApiKey(email, keyId, keyHash, name || 'Default Key');

    return success({
      id: keyId,
      name: name || 'Default Key',
      message: 'API key created successfully',
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

    if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
      return forbidden('Subscription expired or canceled');
    }

    // Update last used timestamp
    await updateKeyLastUsed(keyRecord.userId, keyRecord.keyId);

    return success({
      valid: true,
      userId: keyRecord.userId,
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (error: any) {
    console.error('Validate key error:', error);
    return serverError(error.message);
  }
}
















