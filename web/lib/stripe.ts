import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Find or create a Stripe customer
async function getOrCreateCustomer(email: string, name?: string): Promise<Stripe.Customer> {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId: email,
    },
  });
}

export async function createCheckoutSession(userId: string, email: string, name?: string, isTrialUsed = false) {
  // Get or create customer
  const customer = await getOrCreateCustomer(email, name);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
    },
    allow_promotion_codes: true,
  };

  // Only add trial if user hasn't used it yet
  if (!isTrialUsed) {
    sessionParams.subscription_data = {
      metadata: {
        userId,
      },
      trial_period_days: 7,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}

export async function createCustomerPortalSession(email: string) {
  // Find customer by email
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    throw new Error('No customer found for this email');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  });

  return session;
}

export async function getSubscriptionStatus(email: string) {
  try {
    // Find customer
    const customers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('No customer found for email:', email);
      return null;
    }

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'all',
      limit: 10, // Get more to find active ones
    });

    if (subscriptions.data.length === 0) {
      console.log('No subscriptions found for customer:', customers.data[0].id);
      return null;
    }

    // Get the most recent subscription (or active one)
    const activeSub = subscriptions.data.find(s => s.status === 'active' || s.status === 'trialing') || subscriptions.data[0];
    
    console.log('Found subscription:', {
      id: activeSub.id,
      status: activeSub.status,
      customer: activeSub.customer,
    });

    return {
      status: activeSub.status,
      currentPeriodEnd: new Date(activeSub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
      trialEnd: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
    };
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
}

















