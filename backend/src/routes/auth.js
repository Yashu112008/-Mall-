const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const audit = require('../audit');
const { sendResetEmail } = require('../mailer');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps timing equal for unknown emails
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' } });

const strongPassword = z.string().min(10).max(72)
  .regex(/[a-z]/, 'Needs a lowercase letter').regex(/[A-Z]/, 'Needs an uppercase letter').regex(/[0-9]/, 'Needs a number');

const sign = u => jwt.sign({ sub: u.id, tv: u.token_version, role: u.role }, process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES || '30m' });

router.post('/login', loginLimiter,
  validate(z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(72) }).strict()),
  (req, res) => {
    const { email, password } = req.body;
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const fail = () => res.status(401).json({ error: 'Invalid email or password' });
    if (!u) { bcrypt.compareSync(password, DUMMY_HASH); return fail(); }
    if (u.locked_until > Date.now()) return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
    if (!bcrypt.compareSync(password, u.password_hash)) {
      const fails = u.failed_attempts + 1;
      db.prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?')
        .run(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0, u.id);
      audit({ user: u, ip: req.ip }, 'login_failed', 'users', u.id);
      return fail();
    }
    // Password was correct, so it is safe to tell the user why they cannot enter
    if (!u.active) return res.status(403).json({ error: 'Your account is waiting for admin approval (or has been disabled).' });
    db.prepare('UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?').run(u.id);
    audit({ user: u, ip: req.ip }, 'login', 'users', u.id);
    res.json({ token: sign(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  });

router.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ id, name, email, role });
});

// Logout everywhere: bumping token_version invalidates all existing tokens
router.post('/logout', authenticate, (req, res) => {
  db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(req.user.id);
  audit(req, 'logout', 'users', req.user.id);
  res.json({ message: 'Logged out' });
});

router.post('/change-password', authenticate,
  validate(z.object({ current_password: z.string().max(72), new_password: strongPassword }).strict()),
  (req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!bcrypt.compareSync(req.body.current_password, u.password_hash)) return res.status(401).json({ error: 'Current password is wrong' });
    db.prepare('UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?')
      .run(bcrypt.hashSync(req.body.new_password, 12), u.id);
    audit(req, 'password_changed', 'users', u.id);
    res.json({ message: 'Password changed. Please login again.' });
  });

const limiter = (max) => rateLimit({ windowMs: 60 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' } });
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

// Public sign-up: always creates an INACTIVE staff account. An admin must approve it (Users page -> Enable).
router.post('/register', limiter(5),
  validate(z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(120),
    password: strongPassword,
  }).strict()),
  (req, res) => {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password, 12);
    if (!db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
      const info = db.prepare('INSERT INTO users (name,email,password_hash,role,active) VALUES (?,?,?,?,1)').run(name, email, hash, 'staff');
      audit({ ip: req.ip }, 'register', 'users', info.lastInsertRowid);
    }
    // Same answer whether or not the email existed (does not leak who has an account)
    res.status(201).json({ message: 'Account created you can login.' });
  });

router.post('/forgot-password', limiter(5),
  validate(z.object({ email: z.string().trim().toLowerCase().email().max(120) }).strict()),
  async (req, res, next) => {
    try {
      const u = db.prepare('SELECT id,name,email FROM users WHERE email=? AND active=1').get(req.body.email);
      if (u) {
        const token = crypto.randomBytes(32).toString('hex');
        db.prepare('DELETE FROM password_resets WHERE user_id=?').run(u.id);
        db.prepare('INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (?,?,?)').run(u.id, sha256(token), Date.now() + 30 * 60 * 1000);
        await sendResetEmail(u, `${process.env.APP_URL || 'http://localhost:5000'}/reset-password.html?token=${token}`);
        audit({ ip: req.ip }, 'password_reset_requested', 'users', u.id);
      }
      res.json({ message: 'If that email is registered, a reset link has been sent. It is valid for 30 minutes.' });
    } catch (e) { next(e); }
  });

router.post('/reset-password', limiter(10),
  validate(z.object({ token: z.string().length(64).regex(/^[a-f0-9]+$/), new_password: strongPassword }).strict()),
  (req, res) => {
    const r = db.prepare('SELECT * FROM password_resets WHERE token_hash=?').get(sha256(req.body.token));
    if (!r || r.expires_at < Date.now()) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    db.prepare('UPDATE users SET password_hash=?, token_version=token_version+1, failed_attempts=0, locked_until=0 WHERE id=?')
      .run(bcrypt.hashSync(req.body.new_password, 12), r.user_id);
    db.prepare('DELETE FROM password_resets WHERE user_id=?').run(r.user_id);
    audit({ ip: req.ip }, 'password_reset_done', 'users', r.user_id);
    res.json({ message: 'Password updated. You can login now.' });
  });

module.exports = router;
module.exports.strongPassword = strongPassword;
