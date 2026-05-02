const https = require('https');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { contact, channel, source, timestamp } = req.body || {};
  if (!contact || !channel) { res.status(400).json({ error: 'Missing fields' }); return; }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHAT_ID   = process.env.LEADS_CHAT_ID;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  const channelEmoji = channel === 'Telegram' ? '✈️' : channel === 'WhatsApp' ? '💬' : '📞';
  const time = timestamp ? new Date(timestamp).toLocaleString('ru', { timeZone: 'UTC' }) + ' UTC' : '—';

  // Telegram
  let telegramOk = false;
  try {
    const text = `🔔 *Новая заявка*\n\n${channelEmoji} *Канал:* ${channel}\n📱 *Контакт:* ${contact}\n🌐 *Источник:* ${source || '—'}\n🕐 *Время:* ${time}\n\n⚡️ Ответьте в течение 5 минут!`;
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' });
    const tgRes = await new Promise((resolve, reject) => {
      const r = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, res2 => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => resolve(JSON.parse(d))); });
      r.on('error', reject);
      r.write(body); r.end();
    });
    telegramOk = tgRes.ok === true;
  } catch(e) { console.error('Telegram error:', e.message); }

  // Email
  let emailOk = false;
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: SMTP_USER, pass: SMTP_PASS } });
    await transporter.sendMail({
      from: `"app2.cash Leads" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: `[app2.cash] Новая заявка (${channel})`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px">
        <div style="background:#FFD700;padding:20px;text-align:center"><h1 style="margin:0;color:#000">app2.cash</h1></div>
        <div style="padding:24px;background:#f9f9f9">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:140px">Канал</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">${channelEmoji} ${channel}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">Контакт</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">${contact}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">Источник</td><td style="padding:10px;border-bottom:1px solid #eee">${source || '—'}</td></tr>
            <tr><td style="padding:10px;color:#666">Время</td><td style="padding:10px">${time}</td></tr>
          </table>
          <div style="background:#fff3cd;border:1px solid #FFD700;border-radius:8px;padding:14px;margin-top:20px;text-align:center"><strong>⚡️ Свяжитесь в течение 5 минут!</strong></div>
        </div>
      </div>`
    });
    emailOk = true;
  } catch(e) { console.error('Email error:', e.message); }

  res.status(200).json({ ok: true, tg: telegramOk, email: emailOk, db: false });
};