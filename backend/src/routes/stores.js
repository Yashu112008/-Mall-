const { z } = require('zod');
const crud = require('./crud');
module.exports = crud({
  table: 'stores',
  search: ['name', 'category'],
  schema: z.object({
    name: z.string().trim().min(1).max(100),
    floor: z.number().int().min(-3).max(100),
    category: z.string().trim().min(1).max(50),
    area_sqft: z.number().positive().max(1e6),
    monthly_rent: z.number().min(0).max(1e9).default(0),
    status: z.enum(['occupied', 'vacant', 'maintenance']),
  }).strict(),
});
