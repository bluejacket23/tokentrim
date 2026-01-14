import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserByLicenseKey, getOrCreateUsage, incrementUsage, getUser } from '../lib/dynamodb';
import { success, badRequest, unauthorized, serverError } from '../lib/response';

export async function track(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const licenseKey = event.headers['x-license-key'] || event.headers['X-License-Key'];

    if (!licenseKey) {
      return unauthorized('License key is required');
    }

    // Validate license key
    const user = await getUserByLicenseKey(licenseKey);

    if (!user) {
      return unauthorized('Invalid license key');
    }

    const body = JSON.parse(event.body || '{}');
    const { promptsOptimized = 1, tokensSaved = 0 } = body;

    await incrementUsage(user.email, promptsOptimized, tokensSaved);

    return success({ message: 'Usage tracked successfully' });
  } catch (error: any) {
    console.error('Track usage error:', error);
    return serverError(error.message);
  }
}

export async function getUsage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const licenseKey = event.headers['x-license-key'] || event.headers['X-License-Key'];
    const email = event.queryStringParameters?.email;

    // Can get usage via license key or email
    let userId: string;

    if (licenseKey) {
      const user = await getUserByLicenseKey(licenseKey);

      if (!user) {
        return unauthorized('Invalid license key');
      }
      userId = user.email;
    } else if (email) {
      userId = email;
    } else {
      return badRequest('License key or email is required');
    }

    // Check user exists
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
