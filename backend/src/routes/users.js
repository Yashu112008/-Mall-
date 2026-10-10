// Admin-only user management
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const { strongPassword } = require('./auth');
const audit = require('../audit');

router.use(authorize('admin'));

router.get('/', (req, res) =>
  res.json(db.prepare('SELECT id,name,email,role,active,created_at FROM users ORDER BY id').all()));

router.post('/', validate(z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(120),
  password: strongPassword,
  role: z.enum(['admin', 'manager', 'staff']),
}).strict()), (req, res) => {
  const { name, email, password, role } = req.body;
  const info = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run(name, email, bcrypt.hashSync(password, 12), role);
  audit(req, 'create', 'users', info.lastInsertRowid);
  res.status(201).json({ id: info.lastInsertRowid, name, email, role });
});

router.patch('/:id', validate(z.object({
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  active: z.boolean().optional(),
}).strict()), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role or status' });
  const sets = [], vals = [];
  if (req.body.role) { sets.push('role=?'); vals.push(req.body.role); }
  if (req.body.active !== undefined) { sets.push('active=?'); vals.push(req.body.active ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const info = db.prepare(`UPDATE users SET ${sets.join(',')}, token_version=token_version+1 WHERE id=?`).run(...vals, id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  audit(req, 'update', 'users', id);
  res.json({ message: 'Updated' });
});

module.exports = router;
