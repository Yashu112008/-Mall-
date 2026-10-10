const { z } = require('zod');
const crud = require('./crud');
module.exports = crud({
  table: 'parking',
  search: ['vehicle_number', 'slot'],
  writeRoles: ['admin', 'manager', 'staff'], // gate staff can record vehicles
  schema: z.object({
    vehicle_number: z.string().trim().toUpperCase().regex(/^[A-Z0-9\- ]{4,15}$/, 'Invalid vehicle number'),
    slot: z.string().trim().min(1).max(10),
    vehicle_type: z.enum(['car', 'bike', 'other']),
    entry_time: z.string().min(10).max(30),
    exit_time: z.string().min(10).max(30).nullable().optional(),
    fee: z.number().min(0).max(100000).default(0),
    status: z.enum(['parked', 'exited']),
  }).strict(),
});
