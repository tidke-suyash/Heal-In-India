// ============================================================
// Payments Routes — /api/payments (Razorpay sandbox)
// ============================================================

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { createAuditLog } = require('../middleware/audit.middleware');

let Razorpay;
try { Razorpay = require('razorpay'); } catch (e) {}

function getRazorpayInstance() {
  if (!Razorpay || !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_your')) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// ---- POST /api/payments/create-order ----
router.post('/create-order', requireAuth, async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'booking_id required' });

  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, total_price, currency, status, patient_id')
      .eq('id', booking_id)
      .single();

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.patient_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not in payable state.' });

    const razorpay = getRazorpayInstance();

    if (!razorpay) {
      // Demo mode: simulate payment
      const mockOrderId = 'order_DEMO_' + Date.now();
      await supabaseAdmin.from('payments').insert({
        booking_id,
        patient_id: req.user.id,
        amount: booking.total_price,
        currency: booking.currency || 'INR',
        payment_method: 'razorpay',
        payment_status: 'pending',
        razorpay_order_id: mockOrderId
      });

      return res.json({
        demo: true,
        order_id: mockOrderId,
        amount: booking.total_price * 100,
        currency: booking.currency || 'INR',
        key_id: 'rzp_test_demo',
        booking_ref: booking.booking_ref,
        message: 'Demo mode: Razorpay not configured. Use the "Pay at Clinic" option.'
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(booking.total_price * 100), // paise
      currency: booking.currency || 'INR',
      receipt: booking.booking_ref,
      notes: { booking_id, platform: 'heal-in-india' }
    });

    await supabaseAdmin.from('payments').insert({
      booking_id,
      patient_id: req.user.id,
      amount: booking.total_price,
      currency: booking.currency || 'INR',
      payment_method: 'razorpay',
      payment_status: 'pending',
      razorpay_order_id: order.id
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      booking_ref: booking.booking_ref
    });
  } catch (err) {
    console.error('[Payments/CreateOrder]', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// ---- POST /api/payments/verify ----
router.post('/verify', requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

  try {
    const razorpay = getRazorpayInstance();
    if (razorpay && process.env.RAZORPAY_KEY_SECRET) {
      const crypto = require('crypto');
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment signature verification failed.' });
      }
    }

    // Update payment record
    await supabaseAdmin.from('payments')
      .update({
        payment_status: 'paid',
        razorpay_payment_id,
        razorpay_signature,
        paid_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id);

    // Confirm booking
    await supabaseAdmin.from('bookings')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', booking_id);

    await createAuditLog({
      actorId: req.user.id, action: 'payment_verified',
      entityType: 'booking', entityId: booking_id, req
    });

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: req.user.id,
      title: 'Booking Confirmed!',
      body: 'Your payment was successful and your booking is confirmed.',
      type: 'booking',
      reference_id: booking_id
    });

    res.json({ message: 'Payment verified! Booking confirmed.', booking_id });
  } catch (err) {
    console.error('[Payments/Verify]', err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// ---- POST /api/payments/pay-at-clinic ----
router.post('/pay-at-clinic', requireAuth, async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'booking_id required' });

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('patient_id, total_price, currency').eq('id', booking_id).single();
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.patient_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    await supabaseAdmin.from('payments').insert({
      booking_id,
      patient_id: req.user.id,
      amount: booking.total_price,
      currency: booking.currency,
      payment_method: 'pay_at_clinic',
      payment_status: 'pending'
    });

    await supabaseAdmin.from('bookings').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', booking_id);

    res.json({ message: 'Booking confirmed. You will pay at the clinic.' });
  } catch (err) {
    console.error('[Payments/PayAtClinic]', err);
    res.status(500).json({ error: 'Failed to process pay-at-clinic option.' });
  }
});

module.exports = router;
