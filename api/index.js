const nodemailer = require('nodemailer');

const BOT_TOKEN   = process.env.BOT_TOKEN;
const CHAT_ID     = process.env.LEADS_CHAT_ID;
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;

const BOOK_RU_URL = 'https://vpeqbsctlysjkuceejxp.supabase.co/storage/v1/object/public/books/book-ru.epub';
const BOOK_EN_URL = 'https://vpeqbsctlysjkuceejxp.supabase.co/storage/v1/object/public/books/book-en.epub';

// ── Telegram ──────────────────────────────────────────────
async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
  });
  return res.ok;
}

// ── Email ─────────────────────────────────────────────────
function makeTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendEmail(subject, html, to = SMTP_USER) {
  const transporter = makeTransport();
  await transporter.sendMail({
    from: `app2.cash <${SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// ── Форматирование лида ───────────────────────────────────
function formatLead(body) {
  const { contact, channel, source, timestamp, extra = {} } = body;
  const lines = [
    `📥 <b>Новая заявка</b>`,
    `📌 Источник: ${source || '—'}`,
    `📞 Канал: ${channel || '—'}`,
    `💬 Контакт: ${contact || '—'}`,
  ];
  if (extra.name)    lines.push(`👤 Имя: ${extra.name}`);
  if (extra.country) lines.push(`🌍 Страна: ${extra.country}`);
  if (extra.tg)      lines.push(`✈️ Telegram: ${extra.tg}`);
  if (extra.wa)      lines.push(`💬 WhatsApp: ${extra.wa}`);
  if (extra.email)   lines.push(`📧 Email: ${extra.email}`);
  if (extra.package) lines.push(`📦 Пакет: ${extra.package} ${extra.price || ''}`);
  if (extra.notes)   lines.push(`📝 О себе: ${extra.notes}`);
  lines.push(`🕐 Время: ${timestamp || new Date().toISOString()}`);
  return lines.join('\n');
}

// ── Лид-магнит: сообщение клиенту в Telegram ─────────────
async function sendBookToClient(extra) {
  const { tg, book_url } = extra;
  if (!tg) return; // нет Telegram — не шлём (email ниже)

  // Найдём chat_id по username через getUpdates — не всегда возможно.
  // Поэтому шлём менеджеру задачу переслать, плюс ссылку клиенту если он написал боту.
  // Реальная отправка клиенту работает только если клиент сам написал боту первым.
  // Для надёжности — шлём менеджеру уведомление с просьбой переслать.
  const msg = [
    `📖 <b>Лид-магнит: запрос книги</b>`,
    `👤 Telegram: ${tg}`,
    ``,
    `Пожалуйста, перешли эту ссылку клиенту:`,
    `📥 <a href="${book_url}">${book_url}</a>`,
    ``,
    `<i>Книга «Мунгу Песа» · Марат Ярков · 18+</i>`,
  ].join('\n');

  await sendTelegram(msg);
}

// ── Лид-магнит: письмо клиенту на email ──────────────────
async function sendBookByEmail(extra) {
  const { email, name, book_url } = extra;
  if (!email) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0A0A0A;color:#F0EAD6;border-radius:12px;overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,#C9A84C,#E8C96D)"></div>
      <div style="padding:36px 32px">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px">app2.cash</div>
        <h1 style="font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-1px">Твоя книга готова, ${name || 'друг'}!</h1>
        <p style="color:rgba(240,234,214,.55);margin:0 0 28px;line-height:1.6">
          Ты запросил книгу «Мунгу Песа» — вот она. Читай, впитывай, применяй.
        </p>
        <div style="background:#171717;border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:24px;margin-bottom:28px">
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F05252;margin-bottom:8px">18+ · Не для всех</div>
          <div style="font-size:20px;font-weight:800;margin-bottom:4px">Мунгу Песа</div>
          <div style="font-size:12px;color:rgba(240,234,214,.4);margin-bottom:12px;font-family:monospace">© Марат Ярков, 2026</div>
          <p style="font-size:13px;color:rgba(240,234,214,.55);line-height:1.6;margin:0 0 20px">
            Деньги как сакральная энергия. Духовность, финансы и страсть. 
            Голые истины о наличных, USDT и золоте — инструментах алхимика денежных потоков.
          </p>
          <a href="${book_url}" 
             style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C96D);color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none">
            Скачать книгу (.epub) →
          </a>
        </div>
        <p style="font-size:13px;color:rgba(240,234,214,.35);line-height:1.6;margin:0 0 20px">
          Если кнопка не работает, скопируй ссылку:<br>
          <a href="${book_url}" style="color:#C9A84C;word-break:break-all">${book_url}</a>
        </p>
        <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:20px;font-size:12px;color:rgba(240,234,214,.3)">
          Нужен обмен валют? Пиши менеджеру — отвечаем за 1 минуту.<br>
          <a href="https://wa.me/255756687444" style="color:#25D366">WhatsApp</a> · 
          <a href="https://t.me/app2cas" style="color:#229ED9">Telegram</a> · 
          <a href="https://app2.cash" style="color:#C9A84C">app2.cash</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail('📖 Твоя книга «Мунгу Песа» — скачать', html, email);
}

// ── MAIN HANDLER ──────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const isLeadMagnet = (body.source || '').toLowerCase().includes('lead_magnet');

    // 1. Всегда шлём уведомление менеджеру в Telegram
    const tgText = isLeadMagnet
      ? formatLead(body) + '\n\n📖 <b>Хочет книгу «Мунгу Песа»</b>'
      : formatLead(body);

    const [tgOk] = await Promise.allSettled([sendTelegram(tgText)]);

    // 2. Всегда шлём уведомление менеджеру на email
    const emailSubject = isLeadMagnet
      ? `📖 Лид-магнит: ${body.extra?.name || body.contact}`
      : `📥 Новая заявка: ${body.source || 'сайт'}`;

    const emailHtml = `<pre style="font-family:monospace;white-space:pre-wrap">${tgText.replace(/<[^>]+>/g, '')}</pre>`;
    const [emailOk] = await Promise.allSettled([sendEmail(emailSubject, emailHtml)]);

    // 3. Если лид-магнит — дополнительно шлём книгу клиенту
    if (isLeadMagnet && body.extra) {
      const extra = {
        ...body.extra,
        book_url: body.extra.book_url || BOOK_RU_URL,
      };
      await Promise.allSettled([
        sendBookToClient(extra),   // уведомление менеджеру + задача переслать в TG
        sendBookByEmail(extra),    // письмо клиенту напрямую
      ]);
    }

    // Успех если хотя бы один канал сработал
    const success = tgOk.status === 'fulfilled' || emailOk.status === 'fulfilled';
    return res.status(success ? 200 : 500).json({ ok: success });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
