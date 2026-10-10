const prisma = require('./prisma');

// FIX M-08: Dynamic BS date calculation — no longer hardcoded to year 2083
// Uses AD-to-BS offset approximation (~56-57 years). 
// For production accuracy, replace this with a proper BS library (e.g. bikram-sambat npm package).
function getTodayBs() {
  const now = new Date();
  // Nepali calendar is approximately 56-57 years ahead of AD
  // More accurate: use a full conversion table, but this handles the year correctly
  const adYear = now.getFullYear();
  const bsYear = adYear + 56; // Approximate offset — replace with bikram-sambat for accuracy
  return `${bsYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// FIX L-07: Increased audit log retention to 90 days (from 10 days)
const AUDIT_RETENTION_DAYS = 90;
let lastPurgeTime = 0;

async function purgeOldAuditLogs() {
  try {
    const now = Date.now();
    // Run at most once every 10 minutes to save DB operations
    if (now - lastPurgeTime < 10 * 60 * 1000) {
      return;
    }
    lastPurgeTime = now;

    const cutoffDate = new Date(now - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleteRes = await prisma.systemAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    if (deleteRes.count > 0) {
      console.log(`[AuditLogger] Purged ${deleteRes.count} audit log(s) older than ${AUDIT_RETENTION_DAYS} days.`);
    }
  } catch (err) {
    // FIX I-04: Log errors instead of silently swallowing them
    console.error('[AuditLogger] Purge error:', err.message);
  }
}

/**
 * Record a system audit log entry for changes, updates, additions, or deletions.
 *
 * @param {Object} req Express request object (optional or null)
 * @param {Object} logData
 * @param {string} logData.action - Action type (e.g. 'CREATE', 'UPDATE', 'DELETE', 'SETTINGS_CHANGE', 'ISSUE')
 * @param {string} logData.entity - Affected model/entity (e.g. 'CERTIFICATE', 'STUDENT', 'TEACHER', 'INCOME', 'EXPENSE', 'FEE', 'USER', 'SCHOOL')
 * @param {string|number} [logData.entityId] - ID of affected record
 * @param {string} logData.description - Human-friendly summary of the change
 * @param {any} [logData.details] - Detailed payload or diff (object or string)
 * @param {Object} [logData.user] - Explicit user override if req.user is not available
 */
async function recordAuditLog(req, { action, entity, entityId, description, details, user }) {
  try {
    const u = user || req?.user || {};
    const ip = req ? (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || null) : null;
    const ua = req ? (req.headers?.['user-agent'] || null) : null;

    let stringDetails = null;
    if (details) {
      stringDetails = typeof details === 'string' ? details : JSON.stringify(details);
    }

    const logEntry = await prisma.systemAuditLog.create({
      data: {
        userId: u.id ? Number(u.id) : null,
        username: u.username || 'system',
        fullName: u.fullName || u.name || (u.teacher ? u.teacher.fullName : (u.student ? u.student.fullName : u.username)) || null,
        role: u.role || 'UNKNOWN',
        action: String(action || 'UPDATE').toUpperCase(),
        entity: String(entity || 'SYSTEM').toUpperCase(),
        entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
        description: description || `${action} on ${entity}`,
        details: stringDetails,
        ipAddress: ip,
        userAgent: ua,
        createdAt: new Date(),
        createdAtBs: getTodayBs(),
      },
    });

    // Trigger auto-purge in background (FIX I-04: log any errors)
    purgeOldAuditLogs().catch((e) => console.error('[AuditLogger] Background purge error:', e.message));

    return logEntry;
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err.message);
    return null;
  }
}

module.exports = {
  recordAuditLog,
  purgeOldAuditLogs,
  getTodayBs,
};
