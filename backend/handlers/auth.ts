import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUser, updateUser } from '../lib/dynamodb';
import { success, badRequest, unauthorized, conflict, serverError } from '../lib/response';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function register(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, name } = body;

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    if (password.length < 8) {
      return badRequest('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await getUser(email);
    if (existingUser) {
      return conflict('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      email,
      name,
      passwordHash,
      provider: 'credentials',
      subscriptionStatus: 'none',
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: email, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return success({
      user: {
        id: email,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
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

    // Get user
    const user = await getUser(email);
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
      { userId: email, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return success({
      id: email,
      email: user.email,
      name: user.name,
      image: user.image,
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

    // Check if user exists
    let user = await getUser(email);

    if (user) {
      // Update existing user
      user = await updateUser(email, {
        name: name || user.name,
        image: image || user.image,
      });
    } else {
      // Create new user
      user = await createUser({
        email,
        name,
        image,
        provider,
        providerId,
        subscriptionStatus: 'none',
      });
    }

    return success({
      id: email,
      email: user?.email,
      name: user?.name,
      image: user?.image,
      subscriptionStatus: user?.subscriptionStatus,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return serverError(error.message);
  }
}















