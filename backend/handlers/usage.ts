import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';
import { getApiKeyByHash, getOrCreateUsage, incrementUsage, getUser } from '../lib/dynamodb';
import { success, badRequest, unauthorized, forbidden, serverError } from '../lib/response';

// Hash API key
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function track(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];

    if (!apiKey) {
      return unauthorized('API key is required');
    }

    // Validate API key
    const keyHash = hashKey(apiKey);
    const keyRecord = await getApiKeyByHash(keyHash);

    if (!keyRecord) {
      return unauthorized('Invalid API key');
    }

    const body = JSON.parse(event.body || '{}');
    const { promptsOptimized = 1, tokensSaved = 0 } = body;

    await incrementUsage(keyRecord.userId, promptsOptimized, tokensSaved);

    return success({ message: 'Usage tracked successfully' });
  } catch (error: any) {
    console.error('Track usage error:', error);
    return serverError(error.message);
  }
}

export async function getUsage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    const email = event.queryStringParameters?.email;

    // Can get usage via API key or email
    let userId: string;

    if (apiKey) {
      const keyHash = hashKey(apiKey);
      const keyRecord = await getApiKeyByHash(keyHash);

      if (!keyRecord) {
        return unauthorized('Invalid API key');
      }
      userId = keyRecord.userId;
    } else if (email) {
      userId = email;
    } else {
      return badRequest('API key or email is required');
    }

    // Check subscription
    const user = await getUser(userId);
    if (!user) {
      return unauthorized('User not found');
    }

    const usage = await getOrCreateUsage(userId);

    return success({
      promptsOptimized: usage.promptsOptimized,
      tokensSaved: usage.tokensSaved,
      month: usage.month,
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (error: any) {
    console.error('Get usage error:', error);
    return serverError(error.message);
  }
}






















