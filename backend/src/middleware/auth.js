const jwt = require('jsonwebtoken');
const db = require('../db');

function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const u = db.prepare('SELECT id,name,email,role,active,token_version FROM users WHERE id=?').get(p.sub);
    if (!u || u.token_version !== p.tv) return res.status(401).json({ error: 'Session expired, login again' });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, login again' });
  }
}

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission for this action' });

module.exports = { authenticate, authorize };
