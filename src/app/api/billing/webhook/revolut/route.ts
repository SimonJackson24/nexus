import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/billing/webhook/revolut - Handle Revolut webhook
export async function POST(request: Request) {
  try {
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
        await query(
          `UPDATE payments 
           SET status = 'completed', 
               revolut_payment_id = $1,
               updated_at = NOW()
           WHERE revolut_order_id = $2`,
          [eventData.payment_id || eventData.id, eventData.order_id]
        );
        
        // Get payment details with metadata
        const paymentResult = await query(
          `SELECT * FROM payments WHERE revolut_order_id = $1`,
          [eventData.order_id]
        );
        
        const payment = paymentResult.rows[0];
        
        if (payment?.metadata) {
          let metadata = payment.metadata;
          // Handle metadata as either JSON object or string
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = {};
            }
          }
          
          if (metadata.package_id) {
            // Add credits to user balance
            await query(
              `INSERT INTO user_credits (user_id, credits_balance, total_earned, updated_at)
               VALUES ($1, $2, $2, NOW())
               ON CONFLICT (user_id) 
               DO UPDATE SET 
                 credits_balance = user_credits.credits_balance + $2,
                 total_earned = user_credits.total_earned + $2,
                 updated_at = NOW()`,
              [payment.user_id, metadata.credits]
            );
          }
        }
        break;
        
      case 'payment_failed':
      case 'order_failed':
        // Update payment status to failed
        await query(
          `UPDATE payments 
           SET status = 'failed', updated_at = NOW()
           WHERE revolut_order_id = $1`,
          [eventData.order_id]
        );
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
