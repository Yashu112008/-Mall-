require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
app.use(cors));
const rateLimit = require('express-rate-limit');
const path = require('path');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET missing or shorter than 32 characters. See .env.example');
  process.exit(1);
}

const { authenticate } = require('./src/middleware/auth');
const { notFound, errorHandler } = require('./src/middleware/error');

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
}));

const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || origins.includes(origin)) ? cb(null, true) : cb(new Error('CORS blocked')),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', require('./src/routes/auth'));
app.use('/api/v1/users', authenticate, require('./src/routes/users'));
app.use('/api/v1/stores', authenticate, require('./src/routes/stores'));
app.use('/api/v1/tenants', authenticate, require('./src/routes/tenants'));
app.use('/api/v1/rent', authenticate, require('./src/routes/rent'));
app.use('/api/v1/parking', authenticate, require('./src/routes/parking'));
app.use('/api/v1/dashboard', authenticate, require('./src/routes/dashboard'));

// Serve the frontend from the same server (same origin = simpler and safer)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Mall API running on http://localhost:${PORT}`));
