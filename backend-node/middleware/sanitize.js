// Simple sanitization middleware: trims string fields in body and query
export default function sanitize() {
  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        for (const k of Object.keys(req.body)) {
          if (typeof req.body[k] === 'string') {
            req.body[k] = req.body[k].trim();
            // remove control chars
            req.body[k] = req.body[k].replace(/[\x00-\x1F\x7F]/g, '');
          }
        }
      }
      if (req.query && typeof req.query === 'object') {
        for (const k of Object.keys(req.query)) {
          if (typeof req.query[k] === 'string') {
            req.query[k] = req.query[k].trim();
            req.query[k] = req.query[k].replace(/[\x00-\x1F\x7F]/g, '');
          }
        }
      }
    } catch (err) {
      // ignore
    }
    next();
  };
}
