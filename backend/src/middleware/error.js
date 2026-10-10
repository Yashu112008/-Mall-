exports.notFound = (req, res) => res.status(404).json({ error: 'Route not found' });

exports.errorHandler = (err, req, res, next) => {
  if (err.message === 'CORS blocked') return res.status(403).json({ error: 'Origin not allowed' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'Conflict: duplicate value, missing related record, or record is in use' });
  }
  console.error(err); // details stay in server logs only
  res.status(500).json({ error: 'Something went wrong' });
};
