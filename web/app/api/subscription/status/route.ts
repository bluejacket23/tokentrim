import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/stripe';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-jwt-secret';

export async function GET(req: NextRequest) {
  try {
    // Check for Bearer token (from extension) or NextAuth session (from web)
    const authHeader = req.headers.get('authorization');
    let userEmail: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      // Extension authentication
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userEmail = decoded.email?.toLowerCase();
      } catch {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web authentication
      const session = await getServerSession(authOptions);
      userEmail = session?.user?.email?.toLowerCase() || null;
    }

    if (!userEmail) {
      // Also check query param as fallback
      const emailParam = req.nextUrl.searchParams.get('email');
      if (emailParam) {
        userEmail = emailParam.toLowerCase();
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Get subscription status from Stripe
    const stripeStatus = await getSubscriptionStatus(userEmail);

    // Calculate trial info from session if no Stripe subscription
    const sessionUser = session.user as any;
    
    if (!stripeStatus) {
      // User has no Stripe subscription - check trial status
      const trialEndsAt = sessionUser.trialEndsAt;
      let trialDaysRemaining = sessionUser.trialDaysRemaining || 7;
      let subscriptionStatus = sessionUser.subscriptionStatus || 'trialing';

      if (trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(trialEndsAt);
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
        
        if (trialDaysRemaining === 0 && subscriptionStatus === 'trialing') {
          subscriptionStatus = 'expired';
        }
      }

      return NextResponse.json({
        subscriptionStatus,
        trialEndsAt,
        trialDaysRemaining,
        hasValidAccess: subscriptionStatus === 'trialing' && trialDaysRemaining > 0,
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
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

