/**
 * Stripe Client
 *
 * Initializes and exports the Stripe SDK instance.
 */
import Stripe from 'stripe';

// Lazy initialization to avoid crash during Next.js build when env vars are not set
let _stripe: Stripe | undefined;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripe(), prop);
  },
});

// Default export for backwards compatibility
export default stripe;
