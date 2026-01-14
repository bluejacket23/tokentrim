import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://dxtbchard5.execute-api.us-east-1.amazonaws.com';

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

    // Call backend to sync user
    const response = await fetch(`${BACKEND_URL}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, image, provider, providerId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sync user');
    }

    const data = await response.json();

    return NextResponse.json({
      id: data.email,
      email: data.email,
      name: data.name,
      image: data.image,
      licenseKey: data.licenseKey,
      subscriptionStatus: data.subscriptionStatus,
      trialEndsAt: data.trialEndsAt,
      trialDaysRemaining: data.trialDaysRemaining,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { message: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
