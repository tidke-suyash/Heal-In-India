// ============================================================
// Health Records Routes — /api/records
// ============================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { createAuditLog } = require('../middleware/audit.middleware');

// ---- GET /api/records — Get patient's own records ----
router.get('/', requireAuth, requireRole('patient', 'admin'), async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const { HEALTH_RECORDS } = require('../data/mockData');
    return res.json(HEALTH_RECORDS);
  }
  try {
    const patientId = req.user.role === 'admin' && req.query.patient_id
      ? req.query.patient_id
      : req.user.id;

    const { data, error } = await supabaseAdmin
      .from('health_records')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    const { HEALTH_RECORDS } = require('../data/mockData');
    res.json(HEALTH_RECORDS);
  }
});

// ---- POST /api/records — Create health record (metadata only) ----
router.post('/', requireAuth, requireRole('patient', 'admin'), [
  body('record_type').isIn(['lab_report','prescription','imaging','treatment_history','consultation_note','other']),
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('recorded_date').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { record_type, title, description, recorded_date, tags, clinic_id, practitioner_id, file_url, file_name, file_size, mime_type } = req.body;

    const { data, error } = await supabaseAdmin.from('health_records').insert({
      patient_id: req.user.id,
      record_type, title, description,
      recorded_date: recorded_date || null,
      tags: tags || [],
      clinic_id: clinic_id || null,
      practitioner_id: practitioner_id || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      mime_type: mime_type || null
    }).select().single();

    if (error) throw error;

    await createAuditLog({
      actorId: req.user.id, action: 'health_record_created',
      entityType: 'health_record', entityId: data.id, req
    });

    res.status(201).json({ message: 'Health record saved.', record: data });
  } catch (err) {
    console.error('[Records/Create]', err);
    res.status(500).json({ error: 'Failed to save health record.' });
  }
});

// ---- POST /api/records/upload-url — Get Supabase signed upload URL ----
router.post('/upload-url', requireAuth, requireRole('patient', 'admin'), async (req, res) => {
  const { file_name, mime_type, file_size } = req.body;

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(mime_type)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP images and PDF files are allowed.' });
  }

  const maxBytes = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;
  if (file_size > maxBytes) {
    return res.status(400).json({ error: `File size must be under ${process.env.MAX_FILE_SIZE_MB || 10}MB.` });
  }

  try {
    const ext = file_name.split('.').pop();
    const storagePath = `health-records/${req.user.id}/${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('health-records')
      .createSignedUploadUrl(storagePath);

    if (error) throw error;

    res.json({
      upload_url: data.signedUrl,
      token: data.token,
      path: storagePath
    });
  } catch (err) {
    console.error('[Records/UploadUrl]', err);
    res.status(500).json({ error: 'Failed to generate upload URL.' });
  }
});

// ---- POST /api/records/:id/share — Share record with clinic/practitioner ----
router.post('/:id/share', requireAuth, requireRole('patient'), [
  body('purpose').trim().isLength({ min: 5, max: 500 }),
  body('access_until').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Verify record ownership
    const { data: record } = await supabaseAdmin
      .from('health_records')
      .select('patient_id')
      .eq('id', req.params.id)
      .single();

    if (!record || record.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this record.' });
    }

    const { purpose, access_until, shared_with_clinic_id, shared_with_practitioner_id } = req.body;

    const { data, error } = await supabaseAdmin.from('record_shares').insert({
      record_id: req.params.id,
      patient_id: req.user.id,
      shared_with_clinic_id: shared_with_clinic_id || null,
      shared_with_practitioner_id: shared_with_practitioner_id || null,
      purpose,
      access_until: access_until || null
    }).select().single();

    if (error) throw error;

    await createAuditLog({
      actorId: req.user.id, action: 'record_shared',
      entityType: 'health_record', entityId: req.params.id,
      newValues: { shared_with_clinic_id, purpose }, req
    });

    res.json({ message: 'Record shared successfully.', share: data });
  } catch (err) {
    console.error('[Records/Share]', err);
    res.status(500).json({ error: 'Failed to share record.' });
  }
});

// ---- DELETE /api/records/:id/share/:shareId — Revoke share ----
router.delete('/:id/share/:shareId', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const { data: share } = await supabaseAdmin
      .from('record_shares')
      .select('patient_id')
      .eq('id', req.params.shareId)
      .single();

    if (!share || share.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await supabaseAdmin.from('record_shares').update({ is_revoked: true }).eq('id', req.params.shareId);
    res.json({ message: 'Access revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke access.' });
  }
});

// ---- DELETE /api/records/:id ----
router.delete('/:id', requireAuth, requireRole('patient', 'admin'), async (req, res) => {
  try {
    const { data: record } = await supabaseAdmin.from('health_records').select('patient_id').eq('id', req.params.id).single();
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    if (req.user.role === 'patient' && record.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await supabaseAdmin.from('health_records').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

module.exports = router;
