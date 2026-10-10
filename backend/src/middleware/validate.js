module.exports = schema => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: r.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.body = r.data;
  next();
};
