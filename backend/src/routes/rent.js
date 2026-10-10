const { z } = require('zod');
const crud = require('./crud');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
module.exports = crud({
  table: 'rent',
  search: ['status', 'due_date'],
  schema: z.object({
    tenant_id: z.number().int().positive(),
    amount: z.number().positive().max(1e9),
    due_date: date,
    paid_date: date.nullable().optional(),
    status: z.enum(['paid', 'pending', 'overdue']),
  }).strict(),
});
