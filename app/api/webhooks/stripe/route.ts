import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { headers } from 'next/headers';

<<<<<<< Current (Your changes)
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "Stripe not configured" }),
      { status: 501, headers: { "content-type": "application/json" } }
    );
  }
=======
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - newer Stripe API version
  apiVersion: '2024-11-20.acacia',
});
>>>>>>> Incoming (Background Agent changes)

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json(
        { error: `Webhook Error: ${message}` },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id;

      if (!userId) {
        console.error('No user ID found in session metadata');
        return NextResponse.json(
          { error: 'No user ID found' },
          { status: 400 }
        );
      }

      // Handle package purchase
      if (session.metadata?.package_type) {
        const packageType = session.metadata.package_type;

        // Update has_purchased_package and package_type in Supabase
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            has_purchased_package: true,
            purchased_package_type: packageType,
            // For Authority Vault, also grant founder_license features
            founder_license: packageType === 'vault' ? true : undefined,
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating package purchase:', updateError);
          return NextResponse.json(
            { error: 'Failed to update package purchase' },
            { status: 500 }
          );
        }

        console.log(`Package purchase activated for user: ${userId}, package: ${packageType}`);
      }

      // Handle legacy founder_license purchases (for backwards compatibility)
      if (session.metadata?.type === 'founder_license') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            founder_license: true,
            has_purchased_package: true,
            purchased_package_type: 'vault',
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating founder_license:', updateError);
          return NextResponse.json(
            { error: 'Failed to update founder license' },
            { status: 500 }
          );
        }

        console.log(`Founder license activated for user: ${userId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
