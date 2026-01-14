import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getUserByLicenseKey, hasValidAccess } from '../lib/dynamodb';
import { success, error } from '../lib/response';

/**
 * Validate a license key
 * Called by the extension to check if a key is valid and has active subscription
 */
export async function validate(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { licenseKey } = body;

    if (!licenseKey) {
      return error('License key is required', 400);
    }

    // Look up user by license key
    const user = await getUserByLicenseKey(licenseKey);

    if (!user) {
      return error('Invalid license key', 401);
    }

    // Check if user has valid access (active subscription or trial)
    const accessCheck = hasValidAccess(user);

    // Calculate trial days remaining if applicable
    let trialDaysRemaining: number | undefined;
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return success({
      valid: accessCheck.valid,
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscriptionStatus,
      trialDaysRemaining,
      message: accessCheck.reason,
    });
  } catch (err: any) {
    console.error('Error validating license:', err);
    return error('Failed to validate license key', 500);
  }
}



