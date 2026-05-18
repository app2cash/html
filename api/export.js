// api/export.js — BestChange export file
// app2.cash · https://docs.bestchange.biz/main/index.html
//
// BestChange robot IPs — add to whitelist if you have DDoS protection:
//   178.32.48.31 | 162.19.29.225 | 88.99.97.146
//
// After deploy, file will be at: https://app2.cash/api/export

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const MARGIN       = 0.036   // 3.6% margin on every pair
const RESERVE_USDT = 50000   // your total USDT reserve ($)

const ENABLED = {
  UAE: true,   // USDT <-> Cash AED (Dubai)
  USD: true,   // USDT <-> Cash USD
  EUR: true,   // USDT <-> Cash EUR
  RUB: true,   // USDT <-> Cash RUB
  KZT: true,   // USDT <-> Cash KZT (Kazakhstan)
  TRY: true,   // USDT <-> Cash TRY (Turkey)
  ZAR: true,   // USDT <-> Cash ZAR (South Africa / Eswatini)
  CNY: true,   // USDT <-> Cash CNY (China)
  GBP: true,   // USDT <-> Cash GBP (UK)
  TZS: true,   // USDT <-> Cash TZS (Tanzania)
  UZS: true,   // USDT <-> Cash UZS (Uzbekistan)
  KGS: true,   // USDT <-> Cash KGS (Kyrgyzstan)
  IDR: false,  // USDT <-> Cash IDR (Indonesia) — enable when ready
}

const LIMITS = {
  USDTTRC20: { min: 100,      max: 50000      },
  CASHUSD:   { min: 100,      max: 50000      },
  CASHAED:   { min: 400,      max: 200000     },
  CASHEUR:   { min: 100,      max: 50000      },
  CASHRUB:   { min: 10000,    max: 5000000    },
  CASHKZT:   { min: 50000,    max: 2000000    },
  CASHTRY:   { min: 3000,     max: 1500000    },
  CASHZAR:   { min: 2000,     max: 900000     },
  CASHCNY:   { min: 800,      max: 400000     },
  CASHGBP:   { min: 80,       max: 40000      },
  CASHTZS:   { min: 250000,   max: 130000000  },
  CASHUZS:   { min: 1200000,  max: 630000000  },
  CASHKGS:   { min: 9000,     max: 4500000    },
  CASHIDR:   { min: 1500000,  max: 800000000  },
}

const FALLBACK = {
  AED: 3.672, EUR: 0.920, RUB: 90.00,
  KZT: 450.0, TRY: 32.00, ZAR: 18.50,
  CNY: 7.250, GBP: 0.790, IDR: 16000,
  TZS: 2600,  UZS: 12600, KGS: 90.00,
}

// ─────────────────────────────────────────────
// LIVE RATES
// ─────────────────────────────────────────────

async function getLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'app2cash-export/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.rates) throw new Error('no rates')
    return data.rates
  } catch (e) {
    console.error('[export] fallback rates:', e.message)
    return FALLBACK
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const round = (n, dp) => parseFloat(n.toFixed(dp))

function sellItem(fiatCode, rate, city) {
  // Client sends USDT, gets cash fiat
  const lim = LIMITS.USDTTRC20
  return {
    from: 'USDTTRC20', to: fiatCode,
    in: 1,
    out: round(rate * (1 - MARGIN), 4),
    amount: round(RESERVE_USDT * rate, 2),
    minamount: lim.min, maxamount: lim.max,
    city, param: 'manual',
  }
}

function buyItem(fiatCode, rate, city) {
  // Client sends cash fiat, gets USDT
  const lim = LIMITS[fiatCode] || { min: 100, max: 50000 }
  return {
    from: fiatCode, to: 'USDTTRC20',
    in: 1,
    out: round(1 / (rate * (1 + MARGIN)), 6),
    amount: round(RESERVE_USDT, 2),
    minamount: lim.min, maxamount: lim.max,
    city, param: 'manual',
  }
}

function toXML(items) {
  const rows = items.map(i => {
    let s = `  <item>\n`
    s += `    <from>${i.from}</from>\n`
    s += `    <to>${i.to}</to>\n`
    s += `    <in>${i.in}</in>\n`
    s += `    <out>${i.out}</out>\n`
    s += `    <amount>${i.amount.toFixed(2)}</amount>\n`
    s += `    <minamount>${i.minamount}</minamount>\n`
    s += `    <maxamount>${i.maxamount}</maxamount>\n`
    if (i.city)  s += `    <city>${i.city}</city>\n`
    if (i.param) s += `    <param>${i.param}</param>\n`
    s += `  </item>`
    return s
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rates>\n${rows}\n</rates>`
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  try {
    const fx = await getLiveRates()
    const r = {}
    for (const k of Object.keys(FALLBACK)) {
      r[k] = fx[k] || FALLBACK[k]
    }

    const pairs = [
      { key: 'UAE', code: 'CASHAED', rate: r.AED, city: 'DUBAI' },
      { key: 'USD', code: 'CASHUSD', rate: 1.0 },
      { key: 'EUR', code: 'CASHEUR', rate: r.EUR },
      { key: 'RUB', code: 'CASHRUB', rate: r.RUB },
      { key: 'KZT', code: 'CASHKZT', rate: r.KZT },
      { key: 'TRY', code: 'CASHTRY', rate: r.TRY },
      { key: 'ZAR', code: 'CASHZAR', rate: r.ZAR },
      { key: 'CNY', code: 'CASHCNY', rate: r.CNY },
      { key: 'GBP', code: 'CASHGBP', rate: r.GBP },
      { key: 'TZS', code: 'CASHTZS', rate: r.TZS },
      { key: 'UZS', code: 'CASHUZS', rate: r.UZS },
      { key: 'KGS', code: 'CASHKGS', rate: r.KGS },
      { key: 'IDR', code: 'CASHIDR', rate: r.IDR },
    ]

    const items = []
    for (const { key, code, rate, city } of pairs) {
      if (!ENABLED[key]) continue
      items.push(sellItem(code, rate, city))
      items.push(buyItem(code, rate, city))
    }

    res.status(200).send(toXML(items))

  } catch (err) {
    console.error('[export] fatal:', err)
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><rates></rates>')
  }
}
