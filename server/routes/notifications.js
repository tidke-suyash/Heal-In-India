// Notifications routes
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', requireAuth, async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { NOTIFICATIONS } = require('../data/mockData');
    return res.json(NOTIFICATIONS);
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { NOTIFICATIONS } = require('../data/mockData');
    res.json(NOTIFICATIONS);
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.patch('/mark-all-read', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
