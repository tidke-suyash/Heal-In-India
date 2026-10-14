// ============================================================
// Auth Routes — /api/auth
// ============================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabase');
const { requireAuth } = require('../middleware/auth.middleware');

// Validation rules
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name required (2-100 chars)'),
  body('role').isIn(['patient', 'clinic', 'practitioner']).withMessage('Invalid role selected')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// POST /api/auth/signup
router.post('/signup', signupValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name, role, phone, city, country } = req.body;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for demo
      user_metadata: {
        full_name,
        role,
        phone: phone || null,
        city: city || null,
        country: country || 'India'
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(400).json({ error: error.message });
    }

    // The trigger handle_new_user() creates the profile automatically
    // Optionally update the profile with extra fields
    if (data.user && (phone || city || country)) {
      await supabaseAdmin.from('profiles').update({
        phone: phone || null,
        city: city || null,
        country: country || 'India'
      }).eq('id', data.user.id);
    }

    // Sign in to get session
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return res.status(201).json({
        message: 'Account created. Please log in.',
        userId: data.user.id
      });
    }

    res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: data.user.id,
        email,
        role,
        full_name
      },
      session: session.session
    });
  } catch (err) {
    console.error('[Auth/Signup]', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

    const { email, password } = req.body;

    // Check demo accounts first if DEMO_MODE is on
    if (process.env.DEMO_MODE === 'true') {
      const { DEMO_USERS } = require('../data/mockData');
      const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (demoUser) {
        return res.json({
          message: 'Logged in successfully (Demo Mode)',
          user: demoUser,
          session: {
            access_token: `demo_token_${demoUser.role}_${demoUser.id}`,
            token_type: 'bearer',
            expires_in: 86400,
            user: demoUser
          }
        });
      }
    }

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

      if (error) {
        if (process.env.DEMO_MODE === 'true') {
          const { DEMO_USERS } = require('../data/mockData');
          const fallbackUser = DEMO_USERS[0];
          return res.json({
            message: 'Logged in successfully (Demo Fallback)',
            user: fallbackUser,
            session: {
              access_token: `demo_token_${fallbackUser.role}_${fallbackUser.id}`,
              token_type: 'bearer',
              expires_in: 86400,
              user: fallbackUser
            }
          });
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, full_name, email, city, country, avatar_url')
        .eq('id', data.user.id)
        .single();

      res.json({
        message: 'Logged in successfully',
        user: profile,
        session: data.session
      });
    } catch (err) {
      if (process.env.DEMO_MODE === 'true') {
        const { DEMO_USERS } = require('../data/mockData');
        const fallbackUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || DEMO_USERS[3];
        return res.json({
          message: 'Logged in successfully (Demo Fallback)',
          user: fallbackUser,
          session: {
            access_token: `demo_token_${fallbackUser.role}_${fallbackUser.id}`,
            token_type: 'bearer',
            expires_in: 86400,
            user: fallbackUser
          }
        });
      }
      console.error('[Auth/Login]', err);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.auth.admin.signOut(req.token);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    res.json({ message: 'Logged out.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(`
      *,
      patient_profiles(*),
      practitioners(*)
    `)
    .eq('id', req.user.id)
    .single();

  // Fetch clinic if role is clinic
  let clinic = null;
  if (req.user.role === 'clinic') {
    const { data } = await supabaseAdmin
      .from('clinics')
      .select('id, name, slug, verification_status, is_verified')
      .eq('owner_id', req.user.id)
      .single();
    clinic = data;
  }

  res.json({ profile, clinic });
});

// POST /api/auth/reset-password
router.post('/reset-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const { email } = req.body;
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });
    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists, a password reset email has been sent.' });
  } catch (err) {
    res.json({ message: 'If an account exists, a password reset email has been sent.' });
  }
});

module.exports = router;
