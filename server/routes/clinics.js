// ============================================================
// Clinics Routes — /api/clinics
// ============================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole, requireAdmin } = require('../middleware/rbac.middleware');
const { createAuditLog } = require('../middleware/audit.middleware');

// ---- GET /api/clinics — Search & list clinics ----
router.get('/', async (req, res) => {
  const { city, state, type, specialty, language, min_price, max_price, verified_only, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (process.env.DEMO_MODE === 'true') {
    const { CLINICS } = require('../data/mockData');
    let filtered = [...CLINICS];
    if (city) filtered = filtered.filter(c => c.city.toLowerCase().includes(city.toLowerCase()));
    if (state) filtered = filtered.filter(c => c.state.toLowerCase().includes(state.toLowerCase()));
    if (type) filtered = filtered.filter(c => c.clinic_type === type);
    if (specialty) filtered = filtered.filter(c => c.specialties && c.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase())));
    if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()));
    if (min_price) filtered = filtered.filter(c => c.consultation_fee >= parseFloat(min_price));
    if (max_price) filtered = filtered.filter(c => c.consultation_fee <= parseFloat(max_price));
    if (verified_only === 'true') filtered = filtered.filter(c => c.is_verified);

    const paginated = filtered.slice(offset, offset + parseInt(limit));
    return res.json({
      clinics: paginated,
      pagination: {
        total: filtered.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filtered.length / parseInt(limit))
      }
    });
  }

  try {
    let queryBuilder = supabaseAdmin
      .from('clinics')
      .select(`
        id, name, slug, clinic_type, description, specialties, languages_spoken,
        city, state, country, latitude, longitude, phone, email,
        logo_url, cover_image_url, consultation_fee, currency,
        rating, review_count, is_verified, verification_status, working_hours
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('verification_status', 'approved')
      .range(offset, offset + parseInt(limit) - 1)
      .order('rating', { ascending: false });

    if (city) queryBuilder = queryBuilder.ilike('city', `%${city}%`);
    if (state) queryBuilder = queryBuilder.ilike('state', `%${state}%`);
    if (type) queryBuilder = queryBuilder.eq('clinic_type', type);
    if (specialty) queryBuilder = queryBuilder.contains('specialties', [specialty]);
    if (language) queryBuilder = queryBuilder.contains('languages_spoken', [language]);
    if (min_price) queryBuilder = queryBuilder.gte('consultation_fee', parseFloat(min_price));
    if (max_price) queryBuilder = queryBuilder.lte('consultation_fee', parseFloat(max_price));
    if (search) queryBuilder = queryBuilder.ilike('name', `%${search}%`);

    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    res.json({
      clinics: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    const { CLINICS } = require('../data/mockData');
    return res.json({
      clinics: CLINICS.slice(0, 12),
      pagination: { total: CLINICS.length, page: 1, limit: 12, pages: 1 }
    });
  }
});

// ---- GET /api/clinics/featured ----
router.get('/featured', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { CLINICS } = require('../data/mockData');
    return res.json(CLINICS.slice(0, 8));
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, slug, clinic_type, city, state, logo_url, cover_image_url, rating, review_count, consultation_fee, specialties, is_verified')
      .eq('is_active', true)
      .eq('verification_status', 'approved')
      .order('rating', { ascending: false })
      .limit(8);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { CLINICS } = require('../data/mockData');
    res.json(CLINICS.slice(0, 8));
  }
});

// ---- GET /api/clinics/:slug — Single clinic details ----
router.get('/:slug', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { CLINICS, PACKAGES, PRACTITIONERS } = require('../data/mockData');
    const clinic = CLINICS.find(c => c.slug === req.params.slug) || CLINICS[0];
    const clinicPackages = PACKAGES.filter(p => p.clinic_id === clinic.id);
    const clinicPractitioners = PRACTITIONERS.filter(p => p.clinic_id === clinic.id);
    return res.json({
      ...clinic,
      treatment_packages: clinicPackages,
      practitioners: clinicPractitioners,
      reviews: [
        { id: 'rev1', rating: 5, title: 'Incredible Panchakarma experience', body: 'The doctors and therapists were extremely attentive. My chronic joint pain reduced significantly within 10 days.', author_name: 'David Miller', created_at: '2026-09-12' },
        { id: 'rev2', rating: 5, title: 'Peaceful, authentic and deeply rejuvenating', body: 'Authentic Kerala traditions. Organic meals and serene atmosphere.', author_name: 'Sunita Rao', created_at: '2026-08-25' }
      ]
    });
  }
  try {
    const { data: clinic, error } = await supabaseAdmin
      .from('clinics')
      .select(`
        *,
        clinic_practitioners(
          is_primary, role_at_clinic,
          practitioners(
            id, title, specialization, degrees, years_of_experience, bio, languages_spoken, consultation_fee,
            profiles(full_name, avatar_url)
          )
        ),
        treatment_packages(
          id, name, slug, description, category, duration_days, price, currency, inclusions, image_url, is_featured
        )
      `)
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();

    if (error || !clinic) {
      const { CLINICS, PACKAGES } = require('../data/mockData');
      const fallback = CLINICS.find(c => c.slug === req.params.slug) || CLINICS[0];
      return res.json({ ...fallback, treatment_packages: PACKAGES.filter(p => p.clinic_id === fallback.id), reviews: [] });
    }

    // Fetch reviews
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('id, rating, title, body, is_verified, created_at, profiles(full_name, avatar_url)')
      .eq('clinic_id', clinic.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({ ...clinic, reviews: reviews || [] });
  } catch (err) {
    const { CLINICS, PACKAGES } = require('../data/mockData');
    const fallback = CLINICS[0];
    res.json({ ...fallback, treatment_packages: PACKAGES, reviews: [] });
  }
});

// ---- POST /api/clinics — Register a new clinic ----
router.post('/', requireAuth, requireRole('clinic', 'admin'), [
  body('name').trim().isLength({ min: 3, max: 200 }),
  body('clinic_type').isIn(['ayurveda', 'panchakarma', 'modern_medicine', 'wellness_retreat', 'diagnostics', 'integrated']),
  body('address_line1').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80) + '-' + Date.now().toString(36);

    const { data, error } = await supabaseAdmin.from('clinics').insert({
      ...req.body,
      slug,
      owner_id: req.user.id,
      verification_status: 'pending',
      is_verified: false
    }).select().single();

    if (error) {
      if (error.message.includes('unique')) return res.status(409).json({ error: 'Clinic name already exists.' });
      throw error;
    }

    await createAuditLog({ actorId: req.user.id, action: 'clinic_registered', entityType: 'clinic', entityId: data.id, req });

    res.status(201).json({ message: 'Clinic registered! Under review for verification.', clinic: data });
  } catch (err) {
    console.error('[Clinics/Create]', err);
    res.status(500).json({ error: 'Failed to register clinic.' });
  }
});

// ---- PUT /api/clinics/:id — Update clinic ----
router.put('/:id', requireAuth, requireRole('clinic', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership (unless admin)
    if (req.user.role !== 'admin') {
      const { data: existing } = await supabaseAdmin.from('clinics').select('owner_id').eq('id', id).single();
      if (!existing || existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this clinic.' });
      }
    }

    const safeFields = ['name','description','specialties','languages_spoken','address_line1','address_line2',
      'city','state','pincode','phone','email','website','logo_url','cover_image_url','gallery_urls',
      'consultation_fee','cancellation_policy','working_hours','registration_number'];

    const updateData = {};
    safeFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const { data, error } = await supabaseAdmin.from('clinics').update(updateData).eq('id', id).select().single();
    if (error) throw error;

    res.json({ message: 'Clinic updated.', clinic: data });
  } catch (err) {
    console.error('[Clinics/Update]', err);
    res.status(500).json({ error: 'Failed to update clinic.' });
  }
});

// ---- POST /api/clinics/:id/verify — Admin: verify/reject clinic ----
router.post('/:id/verify', requireAuth, requireAdmin, [
  body('status').isIn(['approved', 'rejected', 'suspended', 'more_docs_required']),
  body('notes').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { status, notes } = req.body;
    const updateData = {
      verification_status: status,
      verification_notes: notes || null,
      is_verified: status === 'approved',
      verified_by: req.user.id,
      verified_at: status === 'approved' ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin.from('clinics').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;

    await createAuditLog({
      actorId: req.user.id, action: `clinic_${status}`,
      entityType: 'clinic', entityId: req.params.id,
      newValues: updateData, req
    });

    res.json({ message: `Clinic ${status}.`, clinic: data });
  } catch (err) {
    console.error('[Clinics/Verify]', err);
    res.status(500).json({ error: 'Failed to update verification status.' });
  }
});

// ---- GET /api/clinics/:id/packages — Get packages for a clinic ----
router.get('/:id/packages', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_packages')
      .select('*, package_schedule_days(*)')
      .eq('clinic_id', req.params.id)
      .eq('is_active', true)
      .order('is_featured', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load packages.' });
  }
});

module.exports = router;
