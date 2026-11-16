const rateLimit = require("express-rate-limit");
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in." });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== "admin") return res.status(403).json({ error: "Administrator access required." });
  next();
}
module.exports = { generalLimiter, authLimiter, requireAuth, requireAdmin };
