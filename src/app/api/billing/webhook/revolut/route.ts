import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/billing/webhook/revolut - Handle Revolut webhook
export async function POST(request: Request) {
  try {
    const supabase = createClient() as any;
    const body = await request.json();
    
    // Verify webhook signature (in production)
    // const signature = request.headers.get('revolut-signature');
    
    // Handle different event types
    const eventType = body.event;
    const eventData = body.data || body;
    
    switch (eventType) {
      case 'payment_completed':
      case 'order_completed':
        // Update payment status
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            revolut_payment_id: eventData.payment_id || eventData.id,
            updated_at: new Date().toISOString(),
          })
          .eq('revolut_order_id', eventData.order_id);
        
        if (updateError) {
          console.error('Error updating payment:', updateError);
          return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
        }
        
        // Grant credits to user
        const { data: payment } = await supabase
          .from('payments')
          .select('*, metadata')
          .eq('revolut_order_id', eventData.order_id)
          .single();
        
        if (payment?.metadata?.package_id) {
          // Add credits to user balance
          await supabase
            .from('user_credits')
            .upsert({
              user_id: payment.user_id,
              credits_balance: payment.metadata.credits,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
        
        break;
        
      case 'payment_failed':
      case 'order_failed':
        // Update payment status to failed
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('revolut_order_id', eventData.order_id);
        break;
        
      default:
        console.log('Unhandled webhook event:', eventType);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
