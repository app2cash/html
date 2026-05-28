const VK_TOKEN = process.env.VK_TOKEN_1;
const MY_VK_ID = 28441036;
const VK_V = '5.131';

const QUERIES = [
  // Базовые
  'обмен валют',
  'купить доллары',
  'купить евро',
  'купить usdt',
  'продать usdt',
  'обмен usdt',
  'где обменять валюту',
  'нужен обменник',
  'обмен криптовалюты',
  'p2p обмен',
  // Международные переводы
  'отправить деньги за границу',
  'перевод денег за рубеж',
  'международный перевод',
  'получить деньги из за рубежа',
  'swift перевод',
  'перевод в другую страну',
  // СНГ
  'купить тенге',
  'купить манаты',
  'купить сум',
  'купить дирхам',
  'перевод в казахстан',
  'перевод в узбекистан',
  'перевод в азербайджан',
  'перевод в беларусь',
  'перевод в армению',
  'купить армянский драм',
  // Азия
  'купить юани',
  'перевод в китай',
  'купить дирхам оаэ',
  'перевод в дубай',
  'перевод в турцию',
  'купить турецкую лиру',
  'перевод в таиланд',
  'купить бат',
  'перевод в индию',
  // Африка
  'перевод в африку',
  'перевод в нигерию',
  'перевод в кению',
  'купить рэнд',
  'перевод в танзанию',
  'перевод в эфиопию',
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
          q,
          count: 20,
          start_time: since,
          extended: 0,
        });

        if (result && result.items) {
          for (const item of result.items) {
            const key = `${item.owner_id}_${item.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              links.push({
                url: `https://vk.com/wall${item.owner_id}_${item.id}`,
                text: (item.text || '').slice(0, 100).replace(/\n/g, ' '),
                keyword: q,
              });
            }
          }
        }
      } catch (e) {
        console.error(`Ошибка "${q}":`, e.message);
      }
      await sleep(400);
    }

    const today = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'Asia/Yekaterinburg',
    });

    let message;
    if (links.length === 0) {
      message = `💱 Мониторинг обмен валют — app2.cash\n${today}\n\nЗа последние 24 часа новых запросов не найдено.`;
    } else {
      const byKeyword = {};
      for (const l of links) {
        if (!byKeyword[l.keyword]) byKeyword[l.keyword] = [];
        byKeyword[l.keyword].push(l);
      }
      const sections = Object.entries(byKeyword).map(([kw, items]) => {
        const lines = items.map((l, i) =>
          `  ${i + 1}. ${l.url}\n     "${l.text || '(без текста)'}"`
        ).join('\n');
        return `🔍 "${kw}":\n${lines}`;
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
    console.error('VK currency monitor ERROR:', e.message);
    res.status(500).json({ error: e.message });
  }
}
