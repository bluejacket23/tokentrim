import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { getUser, hasValidAccess } from '../lib/dynamodb';
import { success, badRequest, unauthorized, notFound, serverError } from '../lib/response';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

/**
 * Exchange auth code for extension session
 * The web app generates a code, extension sends it here to get a session
 */
export async function exchangeCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { code, source } = body;

    if (!code) {
      return badRequest('Auth code is required');
    }

    // In production, we'd validate the code against a cache (Redis)
    // For now, the code is actually a JWT from the web app
    
    let decoded: any;
    try {
      decoded = jwt.verify(code, JWT_SECRET);
    } catch {
      return unauthorized('Invalid or expired auth code');
    }

    const email = decoded.email?.toLowerCase();
    if (!email) {
      return badRequest('Invalid auth code');
    }

    // Get user from database
    const user = await getUser(email);
    if (!user) {
      return notFound('User not found. Please sign up at tokentrim.com first.');
    }

    // Check subscription status
    const hasAccess = hasValidAccess(user);
    const trialDaysRemaining = user.trialEndsAt 
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Generate extension token (long-lived)
    const token = jwt.sign(
      { 
        userId: user.userId,
        email: user.email,
        source: 'extension',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return success({
      email: user.email,
      name: user.name,
      token,
      subscriptionStatus: user.subscriptionStatus || 'none',
      trialDaysRemaining,
      hasValidAccess: hasAccess,
    });
  } catch (error: any) {
    console.error('Exchange code error:', error);
    return serverError(error.message);
  }
}

/**
 * Check subscription status for extension
 */
export async function checkSubscription(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get email from query params or auth header
    const email = event.queryStringParameters?.email;
    const authHeader = event.headers.Authorization || event.headers.authorization;

    if (!email && !authHeader) {
      return badRequest('Email or authorization required');
    }

    let userEmail = email?.toLowerCase();

    // If auth header provided, verify it
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userEmail = decoded.email?.toLowerCase();
      } catch {
        return unauthorized('Invalid token');
      }
    }

    if (!userEmail) {
      return badRequest('Invalid request');
    }

    const user = await getUser(userEmail);
    if (!user) {
      return notFound('User not found');
    }

    const hasAccess = hasValidAccess(user);
    const trialDaysRemaining = user.trialEndsAt 
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return success({
      email: user.email,
      subscriptionStatus: user.subscriptionStatus || 'none',
      trialDaysRemaining,
      trialEndsAt: user.trialEndsAt,
      currentPeriodEnd: user.currentPeriodEnd,
      hasValidAccess: hasAccess,
    });
  } catch (error: any) {
    console.error('Check subscription error:', error);
    return serverError(error.message);
  }
}






