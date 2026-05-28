const VK_TOKEN = process.env.VK_TOKEN_1;
const MY_VK_ID = 28441036;
const VK_V = '5.131';

const GROUPS = [
  { id: '167790584', city: 'Златоуст' },
  { id: '178246615', city: 'Златоуст' },
  { id: '119223902', city: 'Златоуст' },
  { id: '104721623', city: 'Златоуст' },
  { id: '53343192',  city: 'Златоуст' },
  { id: '101832399', city: 'Миасс' },
  { id: '142155777', city: 'Миасс' },
  { id: '229824489', city: 'Сатка' },
  { id: '102128556', city: 'Сатка' },
  { id: '49192814',  city: 'Сатка' },
  { id: '230042053', city: 'Бакал' },
  { id: '63951683',  city: 'Бакал' },
  { id: '87387396',  city: 'Усть-Катав' },
  { id: '229968821', city: 'Трёхгорный' },
  { id: '45749739',  city: 'Трёхгорный' },
];

const KEYWORDS = [
  'нужен ведущий',
  'нужна ведущая',
  'посоветуйте ведущего',
  'посоветуйте тамаду',
  'ищу ведущего',
  'ищу тамаду',
  'нужен тамада',
  'кто проводил свадьбу',
  'посоветуйте на свадьбу',
  'ведущий на свадьбу',
  'тамада на свадьбу',
  'ведущий на юбилей',
  'ведущий на корпоратив',
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

    for (const group of GROUPS) {
      for (const keyword of KEYWORDS) {
        try {
          const result = await vk('wall.search', {
            owner_id: `-${group.id}`,
            query: keyword,
            count: 10,
          });

          if (result && result.items) {
            for (const item of result.items) {
              if (item.date < since) continue;
              const key = `${item.owner_id}_${item.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                links.push({
                  url: `https://vk.com/wall${item.owner_id}_${item.id}`,
                  text: (item.text || '').slice(0, 100).replace(/\n/g, ' '),
                  city: group.city,
                  keyword,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Ошибка группа ${group.id} / "${keyword}":`, e.message);
        }
        await sleep(350);
      }
    }

    const today = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'Asia/Yekaterinburg',
    });

    let message;
    if (links.length === 0) {
      message = `📋 Мониторинг ведущий/тамада — Златоуст и ЗГО\n${today}\n\nЗа последние 24 часа новых запросов не найдено.`;
    } else {
      const byCity = {};
      for (const l of links) {
        if (!byCity[l.city]) byCity[l.city] = [];
        byCity[l.city].push(l);
      }
      const sections = Object.entries(byCity).map(([city, items]) => {
        const lines = items.map((l, i) =>
          `  ${i + 1}. ${l.url}\n     "${l.text || '(без текста)'}"` 
        ).join('\n');
        return `📍 ${city}:\n${lines}`;
      });
      message = `📋 Ведущий / тамада — Златоуст и ЗГО\n${today} | найдено: ${links.length}\n\n${sections.join('\n\n')}`;
    }

    await vk('messages.send', {
      user_id: MY_VK_ID,
      message,
      random_id: Date.now(),
    });

    res.status(200).json({ ok: true, sent: links.length });
  } catch (e) {
    console.error('VK monitor ERROR:', e.message);
    res.status(500).json({ error: e.message });
  }
}
