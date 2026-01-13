import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUser, updateUser } from '@/lib/local-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, image, provider, providerId } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
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
      // Create new user from OAuth
      user = await createUser({
        email,
        name,
        image,
        provider: provider || 'google',
        providerId,
      });
    }

    return NextResponse.json({
      id: email,
      email: user?.email,
      name: user?.name,
      image: user?.image,
      subscriptionStatus: user?.subscriptionStatus,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { message: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}






