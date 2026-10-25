const crypto = require('crypto');
const { CONSTANTS } = require('../config/constants');
module.exports = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  if (!req.isAuthenticated()) {
    if (req.method !== 'GET') return res.status(401).json({ message: '로그인 후 QR을 다시 스캔해주세요.' });
    return res.redirect('/user/login');
  }
  req.session.attendanceCsrf ||= crypto.randomBytes(32).toString('hex');
  res.locals.csrf = req.session.attendanceCsrf;
  res.locals.CONSTANTS = CONSTANTS;
  next();
};