// ============================================================
// Auth Middleware — verifies Supabase JWT token
// ============================================================

const { supabaseAdmin } = require('../supabase');

/**
 * Extracts and verifies the Bearer token from Authorization header.
 * Attaches req.user and req.token on success.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  // Demo Mode Support
  if (token.startsWith('demo_token_') || process.env.DEMO_MODE === 'true') {
    const { DEMO_USERS } = require('../data/mockData');
    let matchedUser = DEMO_USERS.find(u => token.includes(u.role) || token.includes(u.id));
    if (!matchedUser && token.startsWith('demo_token_')) {
      const key = token.replace('demo_token_', '').toLowerCase();
      matchedUser = DEMO_USERS.find(u => u.role.toLowerCase() === key || u.email.toLowerCase().includes(key));
    }
    if (!matchedUser) {
      matchedUser = DEMO_USERS.find(u => u.role === 'patient') || DEMO_USERS[0];
    }
    if (matchedUser) {
      req.user = matchedUser;
      req.token = token;
      return next();
    }
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Fetch profile with role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, is_active')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(401).json({ error: 'User profile not found.' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact support.' });
    }

    req.user = profile;
    req.token = token;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err);
    return res.status(500).json({ error: 'Authentication service error.' });
  }
}

/**
 * Optional auth — attaches user if token present, continues regardless
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, full_name, email, is_active')
        .eq('id', user.id)
        .single();
      req.user = profile;
      req.token = token;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
