const router = require('express').Router();
const db = require('../db');
router.get('/', (req, res) => {
  const one = sql => db.prepare(sql).get();
  res.json({
    stores: one(`SELECT COUNT(*) total,
      SUM(status='occupied') occupied, SUM(status='vacant') vacant, SUM(status='maintenance') maintenance FROM stores`),
    tenants: one('SELECT COUNT(*) total FROM tenants'),
    rent: one(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) collected,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) pending,
      COALESCE(SUM(CASE WHEN status='overdue' THEN amount END),0) overdue FROM rent`),
    parking: one(`SELECT COUNT(*) total, SUM(status='parked') parked_now, COALESCE(SUM(fee),0) revenue FROM parking`),
  });
});
module.exports = router;
