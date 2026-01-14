import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUser, updateUser, User } from '../lib/dynamodb';
import { success, badRequest, unauthorized, conflict, serverError } from '../lib/response';

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to calculate days remaining in trial
function getTrialDaysRemaining(user: User): number {
  if (user.subscriptionStatus !== 'trialing' || !user.trialEndsAt) {
    return 0;
  }
  const now = new Date();
  const trialEnd = new Date(user.trialEndsAt);
  const diffMs = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

// Helper to format user response
function formatUserResponse(user: User) {
  return {
    id: user.email,
    email: user.email,
    name: user.name,
    image: user.image,
    licenseKey: user.licenseKey,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt,
    trialDaysRemaining: getTrialDaysRemaining(user),
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  };
}

export async function register(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, name } = body;

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequest('Invalid email format');
    }

    if (password.length < 8) {
      return badRequest('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await getUser(email.toLowerCase());
    if (existingUser) {
      return conflict('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with 7-day trial (handled in createUser)
    const user = await createUser({
      email: email.toLowerCase(),
      name,
      passwordHash,
      provider: 'credentials',
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.email, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return success({
      user: formatUserResponse(user),
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return conflict('An account with this email already exists');
    }
    return serverError(error.message);
  }
}

export async function login(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    // Get user (normalize email to lowercase)
    const user = await getUser(email.toLowerCase());
    if (!user || !user.passwordHash) {
      return unauthorized('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return unauthorized('Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.email, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return success({
      ...formatUserResponse(user),
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return serverError(error.message);
  }
}

export async function sync(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, name, image, provider, providerId } = body;

    if (!email) {
      return badRequest('Email is required');
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check if user exists
    let user = await getUser(normalizedEmail);

    if (user) {
      // Update existing user with latest OAuth info
      const updates: any = {
        name: name || user.name,
        image: image || user.image,
        provider: provider || user.provider,
        providerId: providerId || user.providerId,
      };
      
      // License key is only generated when user subscribes via Stripe
      user = await updateUser(normalizedEmail, updates);
    } else {
      // Create new user from OAuth - gets 7-day trial automatically
      user = await createUser({
        email: normalizedEmail,
        name,
        image,
        provider: provider || 'google',
        providerId,
      });
    }

    if (!user) {
      return serverError('Failed to create or update user');
    }

    // Generate JWT for the user
    const token = jwt.sign(
      { userId: user.email, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return success({
      ...formatUserResponse(user),
      token,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return serverError(error.message);
  }
}

/**
 * Get current user info
 */
export async function me(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get email from Authorization header (JWT) or query param
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let email: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
        email = decoded.email;
      } catch {
        return unauthorized('Invalid token');
      }
    } else {
      email = event.queryStringParameters?.email;
    }

    if (!email) {
      return badRequest('Email or valid token required');
    }

    const user = await getUser(email.toLowerCase());
    if (!user) {
      return unauthorized('User not found');
    }

    return success(formatUserResponse(user));
  } catch (error: any) {
    console.error('Me error:', error);
    return serverError(error.message);
  }
}

















