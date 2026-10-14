// Reviews routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.get('/clinic/:clinicId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, profiles!reviews_patient_id_fkey(full_name, avatar_url)')
      .eq('clinic_id', req.params.clinicId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reviews.' });
  }
});

router.post('/', requireAuth, requireRole('patient'), [
  body('clinic_id').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').optional().trim().isLength({ max: 200 }),
  body('body').optional().trim().isLength({ max: 2000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { data, error } = await supabaseAdmin.from('reviews').insert({
      patient_id: req.user.id,
      clinic_id: req.body.clinic_id,
      booking_id: req.body.booking_id || null,
      rating: req.body.rating,
      title: req.body.title || null,
      body: req.body.body || null,
      is_published: false // requires admin approval
    }).select().single();

    if (error) {
      if (error.message.includes('unique')) {
        return res.status(409).json({ error: 'You have already reviewed this clinic for this booking.' });
      }
      throw error;
    }

    // Update clinic rating
    const { data: allRatings } = await supabaseAdmin
      .from('reviews').select('rating').eq('clinic_id', req.body.clinic_id).eq('is_published', true);
    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length;
      await supabaseAdmin.from('clinics').update({ rating: avg.toFixed(2), review_count: allRatings.length }).eq('id', req.body.clinic_id);
    }

    res.status(201).json({ message: 'Review submitted for approval.', review: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;
