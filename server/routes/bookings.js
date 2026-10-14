// ============================================================
// Bookings Routes — /api/bookings
// ============================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole, requireAdmin } = require('../middleware/rbac.middleware');
const { createAuditLog } = require('../middleware/audit.middleware');

// Generate booking reference
function generateBookingRef() {
  return 'HI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ---- GET /api/bookings — List user's bookings ----
router.get('/', requireAuth, async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { BOOKINGS } = require('../data/mockData');
    return res.json(BOOKINGS);
  }
  try {
    let queryBuilder = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        clinics(id, name, slug, city, state, logo_url, phone),
        treatment_packages(id, name, duration_days, image_url),
        payments(id, payment_status, payment_method, amount)
      `)
      .order('created_at', { ascending: false });

    if (req.user.role === 'patient') {
      queryBuilder = queryBuilder.eq('patient_id', req.user.id);
    } else if (req.user.role === 'clinic') {
      // Get clinic id
      const { data: clinic } = await supabaseAdmin.from('clinics').select('id').eq('owner_id', req.user.id).single();
      if (clinic) queryBuilder = queryBuilder.eq('clinic_id', clinic.id);
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Filter by status
    if (req.query.status) queryBuilder = queryBuilder.eq('status', req.query.status);

    const { data, error } = await queryBuilder.limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { BOOKINGS } = require('../data/mockData');
    res.json(BOOKINGS);
  }
});

// ---- GET /api/bookings/:id — Single booking ----
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        clinics(*),
        treatment_packages(*, package_schedule_days(*)),
        booking_guests(*),
        payments(*),
        profiles!bookings_patient_id_fkey(full_name, email, phone)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Booking not found.' });

    // Authorization check
    const myClinic = req.user.role === 'clinic'
      ? (await supabaseAdmin.from('clinics').select('id').eq('owner_id', req.user.id).single()).data
      : null;

    if (req.user.role === 'patient' && data.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'clinic' && (!myClinic || data.clinic_id !== myClinic.id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[Bookings/Detail]', err);
    res.status(500).json({ error: 'Failed to load booking.' });
  }
});

// ---- POST /api/bookings — Create booking ----
router.post('/', requireAuth, requireRole('patient', 'admin'), [
  body('clinic_id').isUUID(),
  body('package_id').optional().isUUID(),
  body('check_in_date').isISO8601().withMessage('Valid check-in date required'),
  body('check_out_date').isISO8601().withMessage('Valid check-out date required'),
  body('num_guests').isInt({ min: 1, max: 20 }),
  body('health_notes').optional().isString().isLength({ max: 2000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { clinic_id, package_id, check_in_date, check_out_date, num_guests, health_notes, special_requests, guests } = req.body;

  try {
    // Validate dates
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out must be after check-in.' });
    }

    // Fetch package & price
    let totalPrice = 0;
    if (package_id) {
      const { data: pkg } = await supabaseAdmin.from('treatment_packages').select('price, duration_days, min_advance_days').eq('id', package_id).single();
      if (pkg) {
        // Check advance booking requirement
        const daysUntilCheckin = Math.floor((checkIn - today) / (1000 * 60 * 60 * 24));
        if (daysUntilCheckin < pkg.min_advance_days) {
          return res.status(400).json({ error: `This package requires at least ${pkg.min_advance_days} days advance booking.` });
        }
        totalPrice = pkg.price * parseInt(num_guests);
      }
    }

    // Check availability (prevent double booking)
    if (package_id) {
      const { data: slot } = await supabaseAdmin
        .from('availability_slots')
        .select('id, total_capacity, booked_count')
        .eq('package_id', package_id)
        .lte('start_date', check_in_date)
        .gte('end_date', check_out_date)
        .eq('is_blocked', false)
        .single();

      if (slot) {
        const available = slot.total_capacity - slot.booked_count;
        if (available < parseInt(num_guests)) {
          return res.status(409).json({
            error: `Only ${available} spots available for these dates. Please choose different dates or reduce guests.`
          });
        }
        // Reserve spots
        await supabaseAdmin.from('availability_slots').update({
          booked_count: slot.booked_count + parseInt(num_guests)
        }).eq('id', slot.id);
      }
    }

    // Create booking
    const booking_ref = generateBookingRef();
    const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').insert({
      booking_ref,
      patient_id: req.user.id,
      clinic_id,
      package_id: package_id || null,
      check_in_date,
      check_out_date,
      num_guests: parseInt(num_guests),
      health_notes: health_notes || null,
      special_requests: special_requests || null,
      total_price: totalPrice,
      status: 'pending'
    }).select().single();

    if (bookingError) throw bookingError;

    // Add guests if provided
    if (guests && Array.isArray(guests) && guests.length > 0) {
      const guestRows = guests.map(g => ({ ...g, booking_id: booking.id }));
      await supabaseAdmin.from('booking_guests').insert(guestRows);
    }

    await createAuditLog({
      actorId: req.user.id, action: 'booking_created',
      entityType: 'booking', entityId: booking.id,
      newValues: { booking_ref, clinic_id, check_in_date, check_out_date }, req
    });

    res.status(201).json({
      message: 'Booking created! Complete payment to confirm.',
      booking
    });
  } catch (err) {
    console.error('[Bookings/Create]', err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// ---- PATCH /api/bookings/:id/status — Update booking status ----
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, cancellation_reason, clinic_notes } = req.body;

  const allowedStatuses = ['confirmed', 'cancelled', 'completed', 'refund_requested'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*, clinics(owner_id)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) return res.status(404).json({ error: 'Booking not found.' });

    // Auth check
    const isPatient = booking.patient_id === req.user.id;
    const isClinicOwner = booking.clinics?.owner_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isClinicOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Business rules
    if (status === 'cancelled' && !isPatient && !isAdmin) {
      return res.status(403).json({ error: 'Only patient or admin can cancel a booking.' });
    }
    if (status === 'confirmed' && !isClinicOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only clinic can confirm a booking.' });
    }

    const updateData = {
      status,
      cancellation_reason: status === 'cancelled' ? (cancellation_reason || null) : booking.cancellation_reason,
      cancelled_at: status === 'cancelled' ? new Date().toISOString() : booking.cancelled_at,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : booking.confirmed_at,
      completed_at: status === 'completed' ? new Date().toISOString() : booking.completed_at,
      clinic_notes: clinic_notes !== undefined ? clinic_notes : booking.clinic_notes
    };

    const { data, error } = await supabaseAdmin.from('bookings').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;

    await createAuditLog({
      actorId: req.user.id, action: `booking_${status}`,
      entityType: 'booking', entityId: req.params.id,
      oldValues: { status: booking.status }, newValues: { status }, req
    });

    res.json({ message: `Booking ${status}.`, booking: data });
  } catch (err) {
    console.error('[Bookings/UpdateStatus]', err);
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

module.exports = router;
