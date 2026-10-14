// ============================================================
// RBAC Middleware — Role-Based Access Control
// ============================================================

/**
 * Require one or more roles. Must be used after requireAuth.
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'clinic', 'patient')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`,
        yourRole: req.user.role
      });
    }
    next();
  };
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Require admin or clinic role.
 */
function requireClinicOrAdmin(req, res, next) {
  return requireRole('admin', 'clinic')(req, res, next);
}

/**
 * Require patient role.
 */
function requirePatient(req, res, next) {
  return requireRole('admin', 'patient')(req, res, next);
}

module.exports = { requireRole, requireAdmin, requireClinicOrAdmin, requirePatient };
