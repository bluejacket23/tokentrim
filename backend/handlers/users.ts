import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUser, updateUser } from '../lib/dynamodb';
import { success, badRequest, notFound, serverError } from '../lib/response';

export async function getUser_(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return badRequest('Email is required');
    }
    const user = await getUser(email);

    if (!user) {
      return notFound('User not found');
    }

    return success({
      id: email,
      email: user.email,
      name: user.name,
      image: user.image,
      subscriptionStatus: user.subscriptionStatus,
      customerId: user.customerId,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return serverError(error.message);
  }
}

// Export with correct name for serverless
export { getUser_ as getUser };

export async function updateSubscription(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, customerId, subscriptionId, status } = body;

    if (!userId) {
      return badRequest('User ID is required');
    }

    // Map Stripe status to our status
    let subscriptionStatus: 'none' | 'trialing' | 'active' | 'canceled' = 'none';
    switch (status) {
      case 'active':
        subscriptionStatus = 'active';
        break;
      case 'trialing':
        subscriptionStatus = 'trialing';
        break;
      case 'canceled':
      case 'unpaid':
      case 'past_due':
        subscriptionStatus = 'canceled';
        break;
      default:
        subscriptionStatus = 'none';
    }

    const user = await updateUser(userId, {
      customerId,
      subscriptionId,
      subscriptionStatus,
    });

    if (!user) {
      return notFound('User not found');
    }

    return success({
      id: userId,
      subscriptionStatus: user.subscriptionStatus,
      customerId: user.customerId,
    });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    return serverError(error.message);
  }
}






















