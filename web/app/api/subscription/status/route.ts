import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/stripe';

const BACKEND_URL = process.env.BACKEND_URL || 'https://dxtbchard5.execute-api.us-east-1.amazonaws.com';

export async function GET(req: NextRequest) {
  try {
    // Get user from NextAuth session
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email?.toLowerCase();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user data from backend (includes license key)
    let userData: any = null;
    try {
      const backendRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(userEmail)}`);
      if (backendRes.ok) {
        userData = await backendRes.json();
      }
    } catch (e) {
      console.error('Failed to fetch user from backend:', e);
    }

    // Get subscription status from Stripe
    const stripeStatus = await getSubscriptionStatus(userEmail);

    if (!stripeStatus) {
      // User has no Stripe subscription - use backend data
      const subscriptionStatus = userData?.subscriptionStatus || 'none';
      const trialEndsAt = userData?.trialEndsAt;
      let trialDaysRemaining = 0;

      if (trialEndsAt && subscriptionStatus === 'trialing') {
        const now = new Date();
        const trialEnd = new Date(trialEndsAt);
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      }

      // Valid access only if trialing with days remaining, or active
      const hasValidAccess = 
        subscriptionStatus === 'active' || 
        (subscriptionStatus === 'trialing' && trialDaysRemaining > 0);

      return NextResponse.json({
        subscriptionStatus: trialDaysRemaining === 0 && subscriptionStatus === 'trialing' ? 'expired' : subscriptionStatus,
        trialEndsAt,
        trialDaysRemaining,
        hasValidAccess,
        licenseKey: userData?.licenseKey,
      });
    }

    // Only trust Stripe status if user has a license key in our system
    // This prevents showing active status for old/external subscriptions
    if (!userData?.licenseKey) {
      // User has Stripe subscription but no license key = they didn't go through our flow
      // Treat as no subscription
      return NextResponse.json({
        subscriptionStatus: 'none',
        trialDaysRemaining: 0,
        hasValidAccess: false,
        licenseKey: null,
      });
    }

    // Map Stripe status
    let subscriptionStatus = stripeStatus.status;
    let trialDaysRemaining: number | undefined;

    if (stripeStatus.trialEnd) {
      const now = new Date();
      const trialEnd = new Date(stripeStatus.trialEnd);
      const diffMs = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    const hasValidAccess = 
      subscriptionStatus === 'active' || 
      subscriptionStatus === 'trialing' ||
      subscriptionStatus === 'past_due';

    return NextResponse.json({
      subscriptionStatus,
      trialEndsAt: stripeStatus.trialEnd,
      trialDaysRemaining,
      currentPeriodEnd: stripeStatus.currentPeriodEnd,
      cancelAtPeriodEnd: stripeStatus.cancelAtPeriodEnd,
      hasValidAccess,
      licenseKey: userData?.licenseKey,
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
