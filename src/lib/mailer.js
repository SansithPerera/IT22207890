'use strict';
// Sends contact-form messages by email through Brevo (free: 300 emails a day).
// Set BREVO_API_KEY and MAIL_FROM (a sender email you verified in Brevo).
// Without them nothing is sent and messages stay in Admin > Messages only.
const config = require('../config');

const enabled = () => Boolean(config.brevoApiKey && config.mailFrom);

async function sendMail({ to, toName, subject, text, replyTo }) {
  if (!enabled()) return { sent: false, reason: 'Email is not set up (BREVO_API_KEY / MAIL_FROM).' };
  if (!to) return { sent: false, reason: 'This member has no email address.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'api-key': config.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: config.mailFrom, name: config.mailFromName },
        to: [{ email: to, name: toName || to }],
        subject,
        textContent: text,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      }),
    });
    if (!res.ok) return { sent: false, reason: `Email service answered ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.name === 'AbortError' ? 'Email service timed out.' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendMail, mailEnabled: enabled };
