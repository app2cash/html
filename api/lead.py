from http.server import BaseHTTPRequestHandler
import json
import os
import smtplib
import requests
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

BOT_TOKEN     = os.environ.get('BOT_TOKEN', '')
LEADS_CHAT_ID = os.environ.get('LEADS_CHAT_ID', '')
SMTP_USER     = os.environ.get('SMTP_USER', '')
SMTP_PASS     = os.environ.get('SMTP_PASS', '')
EMAIL_TO      = 'maratyarkov@gmail.com'
EMAIL_FROM    = os.environ.get('SMTP_USER', 'maratyarkov@gmail.com')


def send_telegram(contact, channel, source, ts):
    if not BOT_TOKEN or not LEADS_CHAT_ID:
        return False
    emoji = {'Telegram':'✈️','WhatsApp':'💬','Телефон':'📞'}.get(channel,'📨')
    text = (
        f"🔔 *Новая заявка — расчёт курса*\n\n"
        f"{emoji} *Канал:* {channel}\n"
        f"👤 *Контакт:* `{contact}`\n"
        f"🌐 *Источник:* {source}\n"
        f"🕐 *Время:* {ts}\n\n"
        f"⚡️ _Ответьте в течение 5 минут!_"
    )
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={'chat_id': LEADS_CHAT_ID, 'text': text,
                  'parse_mode': 'Markdown', 'disable_web_page_preview': True},
            timeout=10
        )
        return r.ok
    except Exception:
        return False


def send_email(contact, channel, source, ts):
    if not SMTP_USER or not SMTP_PASS:
        return False
    emoji = {'Telegram':'✈️','WhatsApp':'💬','Телефон':'📞'}.get(channel,'📨')
    html = f"""
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;
            box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#FFD700;padding:22px 26px">
    <h2 style="color:#000;margin:0;font-size:18px">🔔 Новая заявка — расчёт курса</h2>
  </div>
  <div style="padding:22px 26px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:9px 0;color:#888;width:110px">Канал:</td>
          <td style="padding:9px 0;font-weight:bold">{emoji} {channel}</td></tr>
      <tr style="background:#fafafa">
          <td style="padding:9px 8px;color:#888">Контакт:</td>
          <td style="padding:9px 8px;font-weight:bold;font-size:15px">{contact}</td></tr>
      <tr><td style="padding:9px 0;color:#888">Источник:</td>
          <td style="padding:9px 0">{source}</td></tr>
      <tr style="background:#fafafa">
          <td style="padding:9px 8px;color:#888">Время:</td>
          <td style="padding:9px 8px">{ts}</td></tr>
    </table>
    <div style="margin-top:18px;padding:12px;background:#fff8e1;border-left:4px solid #FFD700;
                border-radius:4px;font-size:13px;color:#7a5c00">
      ⚡️ Свяжитесь с клиентом в течение <strong>5 минут!</strong>
    </div>
  </div>
  <div style="padding:12px 26px;background:#f9f9f9;font-size:11px;color:#aaa;text-align:center">
    app2.cash — автоматическое уведомление
  </div>
</div>
</body></html>"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"[app2.cash] Новая заявка — расчёт курса ({channel})"
    msg['From']    = EMAIL_FROM
    msg['To']      = EMAIL_TO
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    try:
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=15) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
        return True
    except Exception:
        return False


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        contact = (data.get('contact') or '').strip()
        channel = (data.get('channel') or 'Telegram').strip()
        source  = (data.get('source')  or 'unknown').strip()
        ts_raw  = data.get('timestamp', '')

        if not contact:
            self._respond(400, {'ok': False, 'error': 'contact required'})
            return

        try:
            dt = datetime.fromisoformat(ts_raw.replace('Z', '+00:00'))
            ts = dt.strftime('%d.%m.%Y %H:%M UTC')
        except Exception:
            ts = datetime.utcnow().strftime('%d.%m.%Y %H:%M UTC')

        tg_ok    = send_telegram(contact, channel, source, ts)
        email_ok = send_email(contact, channel, source, ts)

        self._respond(200, {'ok': True, 'telegram': tg_ok, 'email': email_ok})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, *args):
        pass
