import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Revolut webhook signature verification
function verifyRevolutSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// POST /api/billing/webhook/revolut - Handle Revolut payment webhooks
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('revolut-signature');
    
    // Verify signature in production
    const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyRevolutSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid Revolut signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);
    const supabase = createClient();

    console.log('Revolut webhook event:', event.type);

    switch (event.type) {
      case 'payment_completed': {
        const paymentData = event.data;
        const { order_id, payment_id } = paymentData;

        // Find the payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('revolut_order_id', order_id)
          .single();

        if (paymentError || !payment) {
          console.error('Payment not found for order:', order_id);
          return NextResponse.json({ received: true });
        }

        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            revolut_payment_id: payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Add credits to user
        const credits = payment.metadata?.credits || 0;
        const userId = payment.user_id;

        if (credits > 0) {
          // Use the RPC function to add credits
          const { error: addCreditsError } = await supabase
            .rpc('add_credits', {
              p_user_id: userId,
              p_amount: credits,
              p_type: 'purchase',
              p_description: `Purchase: ${payment.metadata?.item_name || 'Credit Pack'}`,
            });

          if (addCreditsError) {
            console.error('Error adding credits:', addCreditsError);
            // Log for manual intervention
            await supabase
              .from('credit_transactions')
              .insert({
                user_id: userId,
                type: 'purchase',
                amount: credits,
                balance_after: 0,
                description: `Failed to add credits - Payment ID: ${payment.id}`,
              });
          }
        }

        console.log(`Payment completed for user ${userId}: ${credits} credits`);
        break;
      }

      case 'payment_failed': {
        const paymentData = event.data;
        const { order_id } = paymentData;

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('revolut_order_id', order_id);

        console.log('Payment failed for order:', order_id);
        break;
      }

      case 'payment_refunded': {
        const paymentData = event.data;
        const { order_id, refund_id } = paymentData;

        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('revolut_order_id', order_id)
          .single();

        if (payment) {
          // Add refund transaction
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: payment.user_id,
              type: 'refund',
              amount: -(payment.metadata?.credits || 0),
              balance_after: 0,
              description: `Refund via Revolut: ${refund_id}`,
            });
        }

        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            metadata: { ...payment?.metadata, refund_id },
            updated_at: new Date().toISOString(),
          })
          .eq('revolut_order_id', order_id);

        console.log('Payment refunded for order:', order_id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
