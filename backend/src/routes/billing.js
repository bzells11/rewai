import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to your .env file.');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PLAN_PRICES = {
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro:    process.env.STRIPE_PRICE_PRO,
};

const PLAN_NAMES = {
  [process.env.STRIPE_PRICE_GROWTH]: 'growth',
  [process.env.STRIPE_PRICE_PRO]:    'pro',
};

// POST /billing/checkout — create a Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { plan } = req.body;
    const priceId = PLAN_PRICES[plan];
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', req.userId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings?upgraded=1`,
      cancel_url:  `${process.env.FRONTEND_URL}/settings`,
      metadata: { user_id: user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/portal — open Stripe customer portal to manage/cancel
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.userId)
      .single();

    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/webhook — Stripe event handler (raw body required)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripe = getStripe();
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = PLAN_NAMES[priceId] || 'starter';
        await supabaseAdmin.from('users').update({ plan: planName }).eq('id', userId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.user_id;
      if (userId) await supabaseAdmin.from('users').update({ plan: 'starter' }).eq('id', userId);
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0]?.price?.id;
      const planName = PLAN_NAMES[priceId] || 'starter';
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.user_id;
      if (userId) await supabaseAdmin.from('users').update({ plan: planName }).eq('id', userId);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
