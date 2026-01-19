import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // Get user from Supabase
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get package type from request body
    const body = await req.json().catch(() => ({}));
    const packageType = body.packageType as 'sniper' | 'vault';

    if (!packageType || !['sniper', 'vault'].includes(packageType)) {
      return NextResponse.json(
        { error: 'Invalid package type.' },
        { status: 400 }
      );
    }

    // Check if user already has purchased a package
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_purchased_package')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.has_purchased_package) {
      return NextResponse.json(
        { error: 'You already have an active package.' },
        { status: 400 }
      );
    }

    // Define package details
    const packages = {
      sniper: {
        name: 'The Identity Sniper',
        description: 'Cross-platform handle securing, 3 professional bios, and custom niche analysis.',
        amount: 14900, // $149.00 in cents
      },
      vault: {
        name: 'The Authority Vault',
        description: 'Everything in the Sniper package plus 30 days of custom, voice-matched platform blueprints (90 total scripts).',
        amount: 29900, // $299.00 in cents
      },
    };

    const selectedPackage = packages[packageType];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: selectedPackage.description,
              images: [],
            },
            unit_amount: selectedPackage.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?success=true&package=${packageType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?canceled=true`,
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        package_type: packageType,
      },
      custom_text: {
        submit: {
          message: `Securing your ${selectedPackage.name}...`,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
