// Practitioners routes
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.get('/', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { PRACTITIONERS } = require('../data/mockData');
    return res.json(PRACTITIONERS);
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('practitioners')
      .select('*, profiles(full_name, avatar_url, city)')
      .eq('verification_status', 'approved')
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { PRACTITIONERS } = require('../data/mockData');
    res.json(PRACTITIONERS);
  }
});

router.post('/', requireAuth, requireRole('practitioner', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('practitioners').insert({
      profile_id: req.user.id,
      ...req.body
    }).select().single();
    if (error) throw error;
    res.status(201).json({ practitioner: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create practitioner profile.' });
  }
});

module.exports = router;
