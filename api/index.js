const https = require('https');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { contact, channel = 'Telegram', source = 'unknown', timestamp } = req.body || {};
  if (!contact) { res.status(400).json({ ok: false }); return; }

  const ts = timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString();
  const tgOk = await sendTelegram(contact, channel, source, ts);
  const emailOk = await sendEmail(contact, channel, source, ts);
  res.status(200).json({ ok: true, telegram: tgOk, email: emailOk });
};

function sendTelegram(contact, channel, source, ts) {
  return new Promise((resolve) => {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID   = process.env.LEADS_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID) { resolve(false); return; }
    const emoji = { Telegram:'✈️', WhatsApp:'💬', 'Телефон':'📞' }[channel] || '📨';
    const text = `🔔 *Новая заявка — расчёт курса*\n\n${emoji} *Канал:* ${channel}\n👤 *Контакт:* \`${contact}\`\n🌐 *Источник:* ${source}\n🕐 *Время:* ${ts}\n\n⚡️ _Ответьте в течение 5 минут!_`;
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => resolve(r.statusCode === 200));
    req.on('error', () => resolve(false));
    req.write(body); req.end();
  });
}

async function sendEmail(contact, channel, source, ts) {
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  if (!SMTP_USER || !SMTP_PASS) return false;
  const emoji = { Telegram:'✈️', WhatsApp:'💬', 'Телефон':'📞' }[channel] || '📨';
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    await transporter.sendMail({
      from: SMTP_USER,
      to: 'maratyarkov@gmail.com',
      subject: `[app2.cash] Новая заявка — расчёт курса (${channel})`,
      html: `<div style="font-family:Arial;padding:20px;background:#f4f4f4">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
          <div style="background:#FFD700;padding:20px"><h2 style="margin:0;color:#000">🔔 Новая заявка</h2></div>
          <div style="padding:20px">
            <p>${emoji} <b>Канал:</b> ${channel}</p>
            <p>👤 <b>Контакт:</b> <b style="font-size:16px">${contact}</b></p>
            <p>🌐 <b>Источник:</b> ${source}</p>
            <p>🕐 <b>Время:</b> ${ts}</p>
            <div style="background:#fff8e1;border-left:4px solid #FFD700;padding:12px;margin-top:16px">
              ⚡️ Свяжитесь с клиентом в течение <b>5 минут!</b>
            </div>
          </div>
        </div>
      </div>`
    });
    return true;
  } catch(e) { return false; }
}
