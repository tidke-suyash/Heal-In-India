// Treatments routes
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabase');

router.get('/', async (req, res) => {
  const { category } = req.query;
  if (process.env.DEMO_MODE === 'true') {
    const { TREATMENTS } = require('../data/mockData');
    let data = [...TREATMENTS];
    if (category) data = data.filter(t => t.category === category);
    return res.json(data);
  }
  try {
    let q = supabaseAdmin.from('treatments').select('*').eq('is_active', true).order('name');
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { TREATMENTS } = require('../data/mockData');
    let data = [...TREATMENTS];
    if (category) data = data.filter(t => t.category === category);
    res.json(data);
  }
});

router.get('/packages', async (req, res) => {
  const { clinic_id, category, featured } = req.query;
  if (process.env.DEMO_MODE === 'true') {
    const { PACKAGES } = require('../data/mockData');
    let data = [...PACKAGES];
    if (clinic_id) data = data.filter(p => p.clinic_id === clinic_id);
    if (category) data = data.filter(p => p.category === category);
    if (featured === 'true') data = data.filter(p => p.is_featured);
    return res.json(data);
  }
  try {
    let q = supabaseAdmin
      .from('treatment_packages')
      .select('*, clinics(id, name, slug, city, state, logo_url, rating, is_verified), package_schedule_days(*)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false });

    if (clinic_id) q = q.eq('clinic_id', clinic_id);
    if (category) q = q.eq('category', category);
    if (featured === 'true') q = q.eq('is_featured', true);

    const { data, error } = await q.limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { PACKAGES } = require('../data/mockData');
    let data = [...PACKAGES];
    if (clinic_id) data = data.filter(p => p.clinic_id === clinic_id);
    if (category) data = data.filter(p => p.category === category);
    if (featured === 'true') data = data.filter(p => p.is_featured);
    res.json(data);
  }
});

router.get('/packages/:id', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { PACKAGES, CLINICS } = require('../data/mockData');
    const pkg = PACKAGES.find(p => p.id === req.params.id) || PACKAGES[0];
    const clinic = CLINICS.find(c => c.id === pkg.clinic_id) || CLINICS[0];
    return res.json({
      ...pkg,
      clinics: clinic,
      package_schedule_days: [
        { day_number: 1, title: 'Arrival, Prakriti Analysis & Purvakarma', description: 'Comprehensive consultation with Vaidya, dosha assessment, gentle Snehana (oleation).' },
        { day_number: 2, title: 'Deep Tissue Abhyanga & Swedana', description: 'Synchronized warm herbal oil massage followed by medicinal herbal steam.' },
        { day_number: 3, title: 'Shirodhara & Herbal Enema Prep', description: 'Meditative warm oil stream on forehead, nutritional diet protocol.' },
        { day_number: 4, title: 'Main Cleansing Day (Pradhanakarma)', description: 'Targeted detoxification therapy supervised by doctor.' },
        { day_number: 5, title: 'Paschatkarma & Cellular Rejuvenation', description: 'Post-cleansing restorative herbs, gentle yoga, sound bath.' },
        { day_number: 6, title: 'Kizhi & Marma Therapy', description: 'Warm herbal poultice massage to strengthen joints and tissues.' },
        { day_number: 7, title: 'Discharge Consultation & Personalized Diet Plan', description: 'Final pulse diagnosis, take-home rasayanas, long-term lifestyle guidance.' }
      ]
    });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_packages')
      .select('*, clinics(*), package_schedule_days(*)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Package not found.' });
    res.json(data);
  } catch (err) {
    const { PACKAGES, CLINICS } = require('../data/mockData');
    const pkg = PACKAGES.find(p => p.id === req.params.id) || PACKAGES[0];
    const clinic = CLINICS.find(c => c.id === pkg.clinic_id) || CLINICS[0];
    res.json({ ...pkg, clinics: clinic });
  }
});

module.exports = router;
