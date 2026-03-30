import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServer } from '@/lib/supabase-server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder')
}

const PRICE_IDS: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? '',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? '',
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { priceId } = await req.json()
  const price = PRICE_IDS[priceId]

  if (!price) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  const stripe = getStripe()

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      metadata: { supabase_uid: user.id },
    })
    customerId = customer.id
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
    metadata: { supabase_uid: user.id },
  })

  return NextResponse.json({ url: session.url })
}
