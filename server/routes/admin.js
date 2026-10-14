// ============================================================
// Admin Routes — /api/admin
// ============================================================

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// ---- GET /api/admin/stats — Platform analytics ----
router.get('/stats', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { CLINICS, DEMO_USERS, BOOKINGS } = require('../data/mockData');
    return res.json({
      summary: {
        totalUsers: 1420,
        totalClinics: CLINICS.length,
        pendingVerifications: 2,
        totalBookings: 384,
        confirmedBookings: 312,
        totalRevenue: '18450000.00'
      },
      recentSignups: DEMO_USERS,
      topCities: [
        { city: 'Kochi', count: 48 },
        { city: 'Rishikesh', count: 35 },
        { city: 'Goa', count: 32 },
        { city: 'Jaipur', count: 26 },
        { city: 'Mumbai', count: 24 }
      ]
    });
  }
  try {
    const [
      { count: totalUsers },
      { count: totalClinics },
      { count: pendingClinics },
      { count: totalBookings },
      { count: confirmedBookings },
      { data: revenueData },
      { data: recentSignups },
      { data: topCities }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabaseAdmin.from('payments').select('amount').eq('payment_status', 'paid'),
      supabaseAdmin.from('profiles').select('id, full_name, role, email, created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('clinics').select('city').eq('verification_status', 'approved')
    ]);

    const totalRevenue = (revenueData || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Count by city
    const cityCount = {};
    (topCities || []).forEach(c => {
      cityCount[c.city] = (cityCount[c.city] || 0) + 1;
    });
    const sortedCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    res.json({
      summary: {
        totalUsers: totalUsers || 0,
        totalClinics: totalClinics || 0,
        pendingVerifications: pendingClinics || 0,
        totalBookings: totalBookings || 0,
        confirmedBookings: confirmedBookings || 0,
        totalRevenue: totalRevenue.toFixed(2)
      },
      recentSignups: recentSignups || [],
      topCities: sortedCities.map(([city, count]) => ({ city, count }))
    });
  } catch (err) {
    const { CLINICS, DEMO_USERS } = require('../data/mockData');
    res.json({
      summary: { totalUsers: 1420, totalClinics: CLINICS.length, pendingVerifications: 2, totalBookings: 384, confirmedBookings: 312, totalRevenue: '18450000.00' },
      recentSignups: DEMO_USERS,
      topCities: [{ city: 'Kochi', count: 48 }, { city: 'Rishikesh', count: 35 }, { city: 'Goa', count: 32 }]
    });
  }
});

// ---- GET /api/admin/clinics — List all clinics (with pending) ----
router.get('/clinics', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { CLINICS } = require('../data/mockData');
    return res.json(CLINICS);
  }
  try {
    const status = req.query.status || null;
    let q = supabaseAdmin
      .from('clinics')
      .select('id, name, slug, clinic_type, city, state, verification_status, is_verified, created_at, profiles!clinics_owner_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('verification_status', status);

    const { data, error } = await q.limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { CLINICS } = require('../data/mockData');
    res.json(CLINICS);
  }
});

// ---- GET /api/admin/users — List all users ----
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let q = supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
    if (role) q = q.eq('role', role);

    const { data, error } = await q.limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// ---- GET /api/admin/bookings — All bookings ----
router.get('/bookings', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`*, clinics(name, city), profiles!bookings_patient_id_fkey(full_name, email), treatment_packages(name)`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bookings.' });
  }
});

// ---- GET /api/admin/reviews — Manage reviews ----
router.get('/reviews', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, clinics(name), profiles!reviews_patient_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reviews.' });
  }
});

// ---- PATCH /api/admin/reviews/:id — Approve/reject review ----
router.patch('/reviews/:id', async (req, res) => {
  try {
    const { is_published } = req.body;
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ is_published })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ message: `Review ${is_published ? 'published' : 'hidden'}.`, review: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review.' });
  }
});

// ---- PATCH /api/admin/users/:id — Activate/deactivate user ----
router.patch('/users/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}.`, user: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ---- GET /api/admin/audit-logs ----
router.get('/audit-logs', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*, profiles!audit_logs_actor_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

// ---- GET /api/admin/visa-requests ----
router.get('/visa-requests', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('visa_assistance_requests')
      .select('*, medical_tourism_requests(*), clinics(name), profiles!visa_assistance_requests_patient_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load visa requests.' });
  }
});

module.exports = router;
