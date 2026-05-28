const VK_TOKEN = process.env.VK_TOKEN_1;
const MY_VK_ID = 28441036;
const VK_V = '5.131';

const QUERIES = [
  'ведущий свадьба Златоуст',
  'тамада Златоуст',
  'ведущий на свадьбу ЗГО',
  'тамада ЗГО',
  'тамада горнозаводская зона',
  'ведущий свадьба Миасс',
  'ведущий свадьба Сатка',
];

async function vk(method, params = {}) {
  const p = new URLSearchParams({ access_token: VK_TOKEN, v: VK_V, ...params });
  const res = await fetch(`https://api.vk.com/method/${method}?${p}`);
  const json = await res.json();
  if (json.error) throw new Error(`VK ${method}: ${json.error.error_msg}`);
  return json.response;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req, res) {
  try {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const seen = new Set();
    const links = [];

    for (const q of QUERIES) {
      try {
        const result = await vk('newsfeed.search', {
          q, count: 20, start_time: since, extended: 0,
        });
        if (result && result.items) {
          for (const item of result.items) {
            const key = `${item.owner_id}_${item.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              links.push({
                url: `https://vk.com/wall${item.owner_id}_${item.id}`,
                text: (item.text || '').slice(0, 80).replace(/\n/g, ' '),
              });
            }
          }
        }
      } catch (e) { console.error(`Ошибка "${q}":`, e.message); }
      await sleep(400);
    }

    const today = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'Asia/Yekaterinburg',
    });

    const message = links.length === 0
      ? `📋 Мониторинг ведущий/тамада — Златоуст и ЗГО\n${today}\n\nЗа последние 24 часа новых запросов не найдено.`
      : `📋 Ведущий / тамада — Златоуст и ЗГО\n${today} | найдено: ${links.length}\n\n`
        + links.map((l, i) => `${i+1}. ${l.url}\n   ${l.text || '(без текста)'}`).join('\n\n');

    await vk('messages.send', { user_id: MY_VK_ID, message, random_id: Date.now() });

    res.status(200).json({ ok: true, sent: links.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
