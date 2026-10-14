// ============================================================
// Audit Middleware — logs sensitive actions to audit_logs table
// ============================================================

const { supabaseAdmin } = require('../supabase');

/**
 * Creates an audit log entry.
 * Should be called from controllers for sensitive operations.
 */
async function createAuditLog({ actorId, action, entityType, entityId, oldValues, newValues, req }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.['user-agent'] || null
    });
  } catch (err) {
    // Never let audit logging break main flow
    console.error('[Audit Log] Failed to write:', err.message);
  }
}

module.exports = { createAuditLog };
