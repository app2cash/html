const https = require("https");
const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }

  const body = req.body || {};
  const { source = "unknown", timestamp, extra = {} } = body;
  const { name, country, tg, wa, email, ref, notes, type } = extra;

  if (!name) { res.status(400).json({ ok: false }); return; }

  const ts = new Date(timestamp || Date.now()).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  const typeLabel = {
    partner: "Партнерская программа",
    franchise: "Франшиза",
    both: "Партнерка + Франшиза"
  }[type] || source;

  const icons = { partner_page: "🤝", franchise_page: "🏢", main_page: "🏠", exchange_page: "💱" };
  const ico = icons[Object.keys(icons).find(k => source.includes(k))] || "📋";

  const [tgOk, emailOk, dbOk] = await Promise.all([
    sendTg(ico, typeLabel, name, country, tg, wa, email, ref, notes, ts, source),
    sendMail(ico, typeLabel, name, country, tg, wa, email, ref, notes, ts),
    saveDb(name, country, tg, wa, email, ref, notes, type, source),
  ]);

  res.status(200).json({ ok: true, tg: tgOk, email: emailOk, db: dbOk });
};

function sendTg(ico, typeLabel, name, country, tg, wa, email, ref, notes, ts, source) {
  return new Promise((resolve) => {
    const TOKEN = process.env.TG_TOKEN_CRM;
    const CHAT = process.env.TG_CHAT_ID_CRM;
    if (!TOKEN || !CHAT) { resolve(false); return; }

    let t = ico + " <b>Новая заявка app2.cash</b>\n";
    t += "📌 " + typeLabel + "\n";
    t += "━━━━━━━━━━━━━━━━\n";
    if (name) t += "👤 " + name + "\n";
    if (country) t += "🌍 " + country + "\n";
    if (tg) t += "✈️ " + tg + "\n";
    if (wa) t += "📱 " + wa + "\n";
    if (email) t += "📧 " + email + "\n";
    if (ref) t += "🔗 " + ref + "\n";
    if (notes) t += "💬 " + notes + "\n";
    t += "🕐 " + ts + "\n";
    t += "🌐 " + source + "\n";
    t += "⚡️ Ответьте в течение 5 минут!";

    const p = JSON.stringify({
      chat_id: CHAT,
      text: t,
      parse_mode: "HTML",
      disable_web_page_preview: true
    });

    const r = https.request({
      hostname: "api.telegram.org",
      path: "/bot" + TOKEN + "/sendMessage",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(p) }
    }, res => resolve(res.statusCode === 200));

    r.on("error", () => resolve(false));
    r.write(p);
    r.end();
  });
}

async function sendMail(ico, typeLabel, name, country, tg, wa, email, ref, notes, ts) {
  const USER = process.env.SMTP_USER;
  const PASS = process.env.SMTP_PASS;
  if (!USER || !PASS) return false;

  const row = (l, v) => v
    ? "<tr><td style=\"padding:8px 12px;color:#888;font-size:13px\">" + l + "</td><td style=\"padding:8px 12px;color:#F0EAD6;font-size:14px\">" + v + "</td></tr>"
    : "";

  const html = "<body style=\"background:#0A0A0A;font-family:Arial\">"
    + "<div style=\"max-width:520px;margin:32px auto;background:#111;border:1px solid rgba(201,168,76,.3);border-radius:12px;overflow:hidden\">"
    + "<div style=\"background:linear-gradient(135deg,#C9A84C,#E8C96D);padding:20px 28px\">"
    + "<div style=\"font-size:20px;font-weight:800;color:#0A0A0A\">" + ico + " Новая заявка</div>"
    + "<div style=\"color:rgba(0,0,0,.6)\">" + typeLabel + "</div>"
    + "</div>"
    + "<div style=\"padding:28px\">"
    + "<table style=\"width:100%;background:#171717;border-radius:8px\">"
    + row("Имя", name)
    + row("Страна", country)
    + row("Telegram", tg)
    + row("WhatsApp", wa)
    + row("Email", email)
    + row("Реф-код", ref)
    + row("Время", ts)
    + "</table>"
    + (notes ? "<div style=\"margin-top:12px;padding:14px;background:#1F1F1F;border-radius:8px;border-left:3px solid #C9A84C;color:#F0EAD6\">" + notes + "</div>" : "")
    + "<div style=\"margin-top:20px;text-align:center\">"
    + (tg ? "<a href=\"https://t.me/" + tg.replace("@","") + "\" style=\"display:inline-block;background:#C9A84C;color:#0A0A0A;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;margin:4px\">✈️ Telegram</a>" : "")
    + (wa ? "<a href=\"https://wa.me/" + wa.replace(/\D/g,"") + "\" style=\"display:inline-block;background:#25D366;color:#fff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;margin:4px\">📱 WhatsApp</a>" : "")
    + "</div>"
    + "</div></div></body>";

  try {
    const tr = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: USER, pass: PASS }
    });
    await tr.sendMail({
      from: "app2.cash Leads <" + USER + ">",
      to: "maratyarkov@gmail.com",
      subject: "[app2.cash] " + ico + " " + (name || "Лид") + " — " + typeLabel,
      html
    });
    return true;
  } catch(e) {
    console.error("Email:", e.message);
    return false;
  }
}

async function saveDb(name, country, tg, wa, email, ref, notes, type, source) {
  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_KEY;
  if (!URL || !KEY) return false;
  try {
    const r = await fetch(URL + "/rest/v1/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Authorization": "Bearer " + KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        name, country, tg, wa, email,
        ref_code: ref, notes, type, source,
        status: "new",
        created_at: new Date().toISOString()
      })
    });
    return r.ok;
  } catch(e) {
    return false;
  }
}
