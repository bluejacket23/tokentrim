import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-jwt-secret';

/**
 * Exchange auth code for extension session
 * This mimics the backend Lambda function for local development
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Auth code is required' },
        { status: 400 }
      );
    }

    // Verify the JWT code
    let decoded: any;
    try {
      decoded = jwt.verify(code, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired auth code' },
        { status: 401 }
      );
    }

    const email = decoded.email?.toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid auth code' },
        { status: 400 }
      );
    }

    // Get subscription status from Stripe
    const stripeStatus = await getSubscriptionStatus(email);
    
    // Calculate trial days if needed
    let subscriptionStatus: string = 'none';
    let trialDaysRemaining: number = 0;
    let hasValidAccess = false;

    if (stripeStatus) {
      subscriptionStatus = stripeStatus.status;
      if (stripeStatus.trialEnd) {
        const now = new Date();
        const trialEnd = new Date(stripeStatus.trialEnd);
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      }
      hasValidAccess = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due';
    } else {
      // No Stripe subscription - check if they have a trial from registration
      // For now, we'll assume they need to subscribe
      subscriptionStatus = 'none';
      hasValidAccess = false;
    }

    // Generate extension token (long-lived)
    const token = jwt.sign(
      {
        userId: email,
        email: email,
        source: 'extension',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      email: email,
      name: decoded.name,
      token,
      subscriptionStatus,
      trialDaysRemaining,
      hasValidAccess,
    });
  } catch (error: any) {
    console.error('Exchange code error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to exchange code' },
      { status: 500 }
    );
  }
}






