const db = require('./db');
module.exports = (req, action, entity, entityId) =>
  db.prepare('INSERT INTO audit_log (user_id,action,entity,entity_id,ip) VALUES (?,?,?,?,?)')
    .run(req.user ? req.user.id : null, action, entity || null, entityId || null, req.ip);
