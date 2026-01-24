/**
 * Stripe Client
 *
 * Initializes and exports the Stripe SDK instance.
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Default export for backwards compatibility
export default stripe;
