'use strict';
// Admin sign-in with a signed, HTTP-only cookie, plus CSRF protection for
// every form the admin panel submits.
const crypto = require('crypto');
const config = require('../config');
const { setCookie, redirect, HttpError } = require('./http');

const SESSION_COOKIE = 'bl_admin';
const LOGIN_CSRF_COOKIE = 'bl_csrf';

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();
const hmac = (s) => crypto.createHmac('sha256', config.sessionSecret).update(s).digest('base64url');
const randomToken = () => crypto.randomBytes(24).toString('base64url');

// Changing the admin username or password invalidates existing sessions.
const credentialVersion = () => sha256(`${config.adminUser}\n${config.adminPassword}`).toString('hex').slice(0, 12);

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function checkCredentials(username, password) {
  if (!config.adminPassword) return false;
  const userOk = crypto.timingSafeEqual(sha256(username), sha256(config.adminUser));
  const passOk = crypto.timingSafeEqual(sha256(password), sha256(config.adminPassword));
  return userOk && passOk;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac || !safeEqual(mac, hmac(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (payload.v !== credentialVersion()) return null;
    return payload;
  } catch {
    return null;
  }
}

function startSession(req, res, username) {
  const maxAge = config.sessionHours * 3600;
  const payload = { u: username, c: randomToken(), v: credentialVersion(), exp: Date.now() + maxAge * 1000 };
  setCookie(res, SESSION_COOKIE, sign(payload), { maxAge, secure: req.secure, httpOnly: true });
  setCookie(res, LOGIN_CSRF_COOKIE, '', { maxAge: 0, secure: req.secure });
  return payload;
}

function endSession(req, res) {
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0, secure: req.secure });
}

// Attach req.admin if a valid session cookie is present.
function loadSession(req) {
  req.admin = verify(req.cookies[SESSION_COOKIE]);
  return req.admin;
}

// Route guard for /admin pages.
function requireAdmin(req, res) {
  if (loadSession(req)) return true;
  if (req.method === 'GET') {
    const next = encodeURIComponent(req.path + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
    redirect(res, `/admin/login?next=${next}`);
  } else {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  return false;
}

// CSRF token for the login form (double-submit cookie).
function loginCsrf(req, res) {
  let token = req.cookies[LOGIN_CSRF_COOKIE];
  if (!token || token.length < 20) {
    token = randomToken();
    setCookie(res, LOGIN_CSRF_COOKIE, token, { maxAge: 3600, secure: req.secure, httpOnly: true });
  }
  return token;
}

function checkLoginCsrf(req, submitted) {
  const expected = req.cookies[LOGIN_CSRF_COOKIE];
  return Boolean(expected && submitted && safeEqual(expected, submitted));
}

function checkCsrf(req, submitted) {
  if (!req.admin || !submitted || !safeEqual(req.admin.c, submitted)) {
    throw new HttpError(403, 'This form has expired. Go back, reload the page and try again.');
  }
}

module.exports = {
  checkCredentials, startSession, endSession, loadSession, requireAdmin, loginCsrf, checkLoginCsrf, checkCsrf,
};
