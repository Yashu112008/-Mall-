const { z } = require('zod');
const crud = require('./crud');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
module.exports = crud({
  table: 'tenants',
  search: ['name', 'phone', 'email'],
  schema: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number'),
    email: z.string().trim().email().max(120).nullable().optional(),
    store_id: z.number().int().positive().nullable().optional(),
    lease_start: date.nullable().optional(),
    lease_end: date.nullable().optional(),
  }).strict(),
});
