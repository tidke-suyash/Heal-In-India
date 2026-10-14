// ============================================================
// Travel & Visa Assistance Routes — /api/travel
// ============================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole, requireAdmin } = require('../middleware/rbac.middleware');
const { createAuditLog } = require('../middleware/audit.middleware');

// ---- POST /api/travel/request — Submit tourism request ----
router.post('/request', requireAuth, requireRole('patient', 'admin'), [
  body('nationality').trim().notEmpty(),
  body('treatment_interest').trim().notEmpty(),
  body('preferred_city').optional().isString(),
  body('num_travelers').isInt({ min: 1, max: 10 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { data, error } = await supabaseAdmin.from('medical_tourism_requests').insert({
      patient_id: req.user.id,
      ...req.body
    }).select().single();

    if (error) throw error;
    res.status(201).json({ message: 'Tourism request submitted.', request: data });
  } catch (err) {
    console.error('[Travel/Request]', err);
    res.status(500).json({ error: 'Failed to submit tourism request.' });
  }
});

// ---- GET /api/travel/requests — Get patient's tourism requests ----
router.get('/requests', requireAuth, async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { TRAVEL_REQUESTS } = require('../data/mockData');
    return res.json(TRAVEL_REQUESTS);
  }
  try {
    let q = supabaseAdmin
      .from('medical_tourism_requests')
      .select('*, clinics(name, city, logo_url), visa_assistance_requests(*)')
      .order('created_at', { ascending: false });

    if (req.user.role !== 'admin') q = q.eq('patient_id', req.user.id);

    const { data, error } = await q.limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { TRAVEL_REQUESTS } = require('../data/mockData');
    res.json(TRAVEL_REQUESTS);
  }
});

// ---- POST /api/travel/visa — Create visa assistance request ----
router.post('/visa', requireAuth, requireRole('patient', 'admin'), [
  body('tourism_request_id').isUUID(),
  body('clinic_id').optional().isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const defaultChecklist = {
      medical_docs: false,
      travel_insurance: false,
      invitation_letter: false,
      accommodation: false,
      local_transport: false,
      passport_valid: false,
      visa_application: false
    };

    const { data, error } = await supabaseAdmin.from('visa_assistance_requests').insert({
      tourism_request_id: req.body.tourism_request_id,
      patient_id: req.user.id,
      clinic_id: req.body.clinic_id || null,
      status: 'submitted',
      checklist_items: defaultChecklist
    }).select().single();

    if (error) throw error;
    res.status(201).json({ message: 'Visa assistance request created.', request: data });
  } catch (err) {
    console.error('[Travel/Visa]', err);
    res.status(500).json({ error: 'Failed to create visa assistance request.' });
  }
});

// ---- PATCH /api/travel/visa/:id — Update visa request (patient or admin/clinic) ----
router.patch('/visa/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('visa_assistance_requests')
      .select('patient_id, clinic_id, status')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Request not found.' });

    const isPatient = existing.patient_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isClinic = req.user.role === 'clinic';

    if (!isPatient && !isAdmin && !isClinic) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const allowedFields = {};
    if (isPatient) {
      if (req.body.checklist_items) allowedFields.checklist_items = req.body.checklist_items;
    }
    if (isAdmin || isClinic) {
      if (req.body.status) allowedFields.status = req.body.status;
      if (req.body.support_letter_url) {
        allowedFields.support_letter_url = req.body.support_letter_url;
        allowedFields.support_letter_issued_at = new Date().toISOString();
      }
      if (req.body.admin_notes) allowedFields.admin_notes = req.body.admin_notes;
      allowedFields.reviewed_by = req.user.id;
      allowedFields.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('visa_assistance_requests')
      .update(allowedFields)
      .eq('id', req.params.id)
      .select().single();

    if (error) throw error;

    await createAuditLog({
      actorId: req.user.id, action: 'visa_request_updated',
      entityType: 'visa_request', entityId: req.params.id,
      newValues: allowedFields, req
    });

    res.json({ message: 'Visa request updated.', request: data });
  } catch (err) {
    console.error('[Travel/Visa/Update]', err);
    res.status(500).json({ error: 'Failed to update visa request.' });
  }
});

// ---- GET /api/travel/checklist — Return visa guidance checklist ----
router.get('/checklist', (req, res) => {
  res.json({
    disclaimer: 'This is general guidance only. Heal in India does not issue visas. All visa decisions are made by the Government of India.',
    visa_type: 'Ayush Visa (eAY)',
    eligibility: 'Foreign nationals seeking treatment at recognized Ayush/wellness institutions',
    steps: [
      {
        step: 1,
        title: 'Select Treatment & Clinic',
        description: 'Choose a verified AYUSH-certified clinic on our platform',
        items: ['Browse verified clinics', 'Choose treatment package', 'Contact clinic for pre-assessment']
      },
      {
        step: 2,
        title: 'Medical Documents',
        description: 'Gather your health records for the clinic',
        items: ['Recent medical reports', 'Current prescriptions', 'Diagnostic reports', 'Referral letter (if applicable)']
      },
      {
        step: 3,
        title: 'Request Invitation Letter',
        description: 'Clinic issues a treatment support/invitation letter',
        items: ['Request through platform', 'Clinic reviews and prepares letter', 'Download from dashboard', 'Letter valid for 6 months typically']
      },
      {
        step: 4,
        title: 'Travel Insurance',
        description: 'Secure travel & medical insurance for your trip',
        items: ['Coverage for medical treatment', 'Emergency evacuation', 'Travel cancellation', 'Min 30-day coverage recommended']
      },
      {
        step: 5,
        title: 'Apply for Ayush Visa',
        description: 'Apply online at indianvisaonline.gov.in',
        items: ['Valid passport (6+ months)', 'Passport-size photo', 'Clinic invitation letter', 'Travel itinerary', 'Proof of funds', 'Travel insurance']
      },
      {
        step: 6,
        title: 'Travel & Accommodation',
        description: 'Plan your stay in India',
        items: ['Book flights', 'Arrange accommodation (many clinics have on-site stays)', 'Local transport from airport', 'Emergency contacts in India']
      }
    ],
    important_links: [
      { label: 'India Visa Online Portal', url: 'https://indianvisaonline.gov.in' },
      { label: 'AYUSH Ministry', url: 'https://main.ayush.gov.in' },
      { label: 'India Tourism', url: 'https://www.incredibleindia.org' }
    ]
  });
});

module.exports = router;
