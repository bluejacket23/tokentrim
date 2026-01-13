import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { getUser, updateUser } from '../lib/dynamodb';
import { success, badRequest, unauthorized, serverError } from '../lib/response';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const PRICE_ID = process.env.STRIPE_PRICE_ID!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tokentrim.com';

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    if (!email) {
      return badRequest('Email is required');
    }

    // Get user
    const user = await getUser(email.toLowerCase());
    if (!user) {
      return unauthorized('User not found');
    }

    // Check if user already has an active subscription
    if (user.subscriptionStatus === 'active') {
      return badRequest('You already have an active subscription');
    }

    // Create or retrieve Stripe customer
    let customerId = user.customerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.email,
        },
      });
      customerId = customer.id;
      
      // Save customer ID to user
      await updateUser(user.email, {
        customerId,
        GSI1PK: 'CUSTOMER',
        GSI1SK: customerId,
      } as any);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      // 7-day free trial if user hasn't used trial yet
      subscription_data: user.subscriptionStatus === 'trialing' ? undefined : {
        trial_period_days: 7,
      },
      success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${FRONTEND_URL}/dashboard?canceled=true`,
      metadata: {
        userId: user.email,
      },
    });

    return success({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    return serverError(error.message);
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    if (!email) {
      return badRequest('Email is required');
    }

    // Get user
    const user = await getUser(email.toLowerCase());
    if (!user || !user.customerId) {
      return badRequest('No subscription found');
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.customerId,
      return_url: `${FRONTEND_URL}/dashboard`,
    });

    return success({
      url: session.url,
    });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    return serverError(error.message);
  }
}

/**
 * Get subscription status for a user
 */
export async function getSubscriptionStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return badRequest('Email is required');
    }

    const user = await getUser(email.toLowerCase());
    if (!user) {
      return unauthorized('User not found');
    }

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      const diffMs = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    // Check if trial has expired
    const isTrialExpired = user.subscriptionStatus === 'trialing' && trialDaysRemaining === 0;

    return success({
      subscriptionStatus: isTrialExpired ? 'expired' : user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      trialDaysRemaining,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      hasValidAccess: !isTrialExpired && (
        user.subscriptionStatus === 'active' || 
        user.subscriptionStatus === 'trialing' ||
        user.subscriptionStatus === 'past_due'
      ),
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return serverError(error.message);
  }
}

/**
 * Handle Stripe webhook events
 */
export async function webhook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    
    if (!sig) {
      return badRequest('Missing Stripe signature');
    }

    let stripeEvent: Stripe.Event;
    
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body!,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return badRequest(`Webhook signature verification failed: ${err.message}`);
    }

    console.log('Received Stripe event:', stripeEvent.type);

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return success({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return serverError(error.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  console.log(`Checkout completed for user ${userId}`);

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await updateUser(userId, {
    customerId,
    subscriptionId,
    subscriptionStatus: subscription.status === 'trialing' ? 'trialing' : 'active',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    GSI1PK: 'CUSTOMER',
    GSI1SK: customerId,
  } as any);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get user by customer ID
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  
  const userId = customer.metadata?.userId || (customer as Stripe.Customer).email;
  if (!userId) {
    console.error('Cannot find user for customer:', customerId);
    return;
  }

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`);

  // Map Stripe status to our status
  let status: 'trialing' | 'active' | 'canceled' | 'past_due' = 'active';
  switch (subscription.status) {
    case 'trialing':
      status = 'trialing';
      break;
    case 'active':
      status = 'active';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    case 'past_due':
      status = 'past_due';
      break;
  }

  await updateUser(userId, {
    subscriptionId: subscription.id,
    subscriptionStatus: status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    // If trialing on Stripe, update trial end
    ...(subscription.trial_end && {
      trialEndsAt: new Date(subscription.trial_end * 1000).toISOString(),
    }),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  
  const userId = customer.metadata?.userId || (customer as Stripe.Customer).email;
  if (!userId) return;

  console.log(`Subscription deleted for user ${userId}`);

  await updateUser(userId, {
    subscriptionStatus: 'canceled',
    subscriptionId: undefined,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  
  const userId = customer.metadata?.userId || (customer as Stripe.Customer).email;
  if (!userId) return;

  console.log(`Payment succeeded for user ${userId}`);

  // Payment succeeded - ensure subscription is active
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await updateUser(userId, {
      subscriptionStatus: subscription.status === 'trialing' ? 'trialing' : 'active',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  
  const userId = customer.metadata?.userId || (customer as Stripe.Customer).email;
  if (!userId) return;

  console.log(`Payment failed for user ${userId}`);

  // Mark as past_due - Stripe will retry
  await updateUser(userId, {
    subscriptionStatus: 'past_due',
  });
}






