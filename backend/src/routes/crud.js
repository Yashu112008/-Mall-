// Reusable secure CRUD router. Table/column names come from our own code (never from the user);
// every value goes through zod validation + parameterised queries (SQL-injection safe).
const express = require('express');
const db = require('../db');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const audit = require('../audit');

module.exports = function crud({ table, schema, search = [], writeRoles = ['admin', 'manager'], deleteRoles = ['admin'] }) {
  const r = express.Router();
  const id = req => Number.parseInt(req.params.id, 10);

  r.get('/', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = String(req.query.q || '').slice(0, 50);
    const where = q && search.length ? 'WHERE ' + search.map(c => `${c} LIKE ?`).join(' OR ') : '';
    const params = q && search.length ? search.map(() => `%${q}%`) : [];
    const total = db.prepare(`SELECT COUNT(*) c FROM ${table} ${where}`).get(...params).c;
    const rows = db.prepare(`SELECT * FROM ${table} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    res.json({ data: rows, page, limit, total });
  });

  r.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id(req));
    row ? res.json(row) : res.status(404).json({ error: 'Not found' });
  });

  r.post('/', authorize(...writeRoles), validate(schema), (req, res) => {
    const cols = Object.keys(req.body);
    const info = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...Object.values(req.body));
    audit(req, 'create', table, info.lastInsertRowid);
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(info.lastInsertRowid));
  });

  r.put('/:id', authorize(...writeRoles), validate(schema.partial()), (req, res) => {
    const cols = Object.keys(req.body);
    if (!cols.length) return res.status(400).json({ error: 'Nothing to update' });
    const info = db.prepare(`UPDATE ${table} SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`).run(...Object.values(req.body), id(req));
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    audit(req, 'update', table, id(req));
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id(req)));
  });

  r.delete('/:id', authorize(...deleteRoles), (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id(req));
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    audit(req, 'delete', table, id(req));
    res.json({ message: 'Deleted' });
  });

  return r;
};
