const VK_TOKEN = process.env.VK_TOKEN_1;
const MY_VK_ID = 28441036;
const VK_V = '5.131';

const GROUPS = [
  { id: '76231763',  name: 'Подслушано Москва' },
  { id: '67083068',  name: 'Подслушано СПб' },
  { id: '129243762', name: 'Подслушано Екатеринбург' },
  { id: '99484444',  name: 'Подслушано Краснодар' },
  { id: '43074280',  name: 'Русская эмиграция' },
  { id: '63877508',  name: 'Турция Алания' },
  { id: '18617238',  name: 'Русская Турция' },
  { id: '53463795',  name: 'Русские в Таиланде' },
  { id: '179733627', name: 'Русские в Дубае' },
  { id: '176276453', name: 'Russians in Africa' },
];

const KEYWORDS = [
  'обмен валют',
  'купить доллары',
  'купить евро',
  'купить usdt',
  'продать usdt',
  'обмен usdt',
  'где обменять',
  'нужен обменник',
  'перевод за границу',
  'отправить деньги',
  'перевод в дубай',
  'перевод в турцию',
  'перевод в таиланд',
  'перевод в китай',
  'купить юани',
  'купить тенге',
  'купить дирхам',
  'swift перевод',
  'международный перевод',
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
                  group: group.name,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Ошибка ${group.name} / "${keyword}":`, e.message);
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
      message = `💱 Мониторинг обмен валют — app2.cash\n${today}\n\nЗа последние 24 часа новых запросов не найдено.`;
    } else {
      const byGroup = {};
      for (const l of links) {
        if (!byGroup[l.group]) byGroup[l.group] = [];
        byGroup[l.group].push(l);
      }
      const sections = Object.entries(byGroup).map(([group, items]) => {
        const lines = items.map((l, i) =>
          `  ${i + 1}. ${l.url}\n     "${l.text || '(без текста)'}"`
        ).join('\n');
        return `📍 ${group}:\n${lines}`;
      });
      message = `💱 Обмен валют / USDT / переводы — app2.cash\n${today} | найдено: ${links.length}\n\n${sections.join('\n\n')}`;
    }

    await vk('messages.send', {
      user_id: MY_VK_ID,
      message,
      random_id: Date.now(),
    });

    res.status(200).json({ ok: true, sent: links.length });
  } catch (e) {
    console.error('VK currency ERROR:', e.message);
    res.status(500).json({ error: e.message });
  }
}
