// pages/api/export.ts
// BestChange export file — app2.cash
// Docs: https://docs.bestchange.biz/main/index.html
// Deploy: Vercel (push to main → auto-deploy)
// URL after deploy: https://app2.cash/api/export
//
// BestChange robot IPs — whitelist in Vercel / DDoS protection:
//   178.32.48.31 | 162.19.29.225 | 88.99.97.146

import type { NextApiRequest, NextApiResponse } from 'next'

// ─────────────────────────────────────────────
// CONFIG — edit these values as your business changes
// ─────────────────────────────────────────────

const MARGIN = 0.036          // 3.6% — your margin on every pair
const RESERVE_USDT = 50000    // your total USDT reserve in USD equivalent
                              // BestChange requires minimum $10,000

// Directions you offer. Set to false to disable a pair.
const ENABLED = {
  UAE:         true,   // USDT <-> Cash AED (Dubai)
  USD:         true,   // USDT <-> Cash USD
  EUR:         true,   // USDT <-> Cash EUR (Amsterdam / EU)
  RUB:         true,   // USDT <-> Cash RUB
  KZT:         true,   // USDT <-> Cash KZT (Kazakhstan)
  TRY:         true,   // USDT <-> Cash TRY (Turkey)
  ZAR:         true,   // USDT <-> Cash ZAR (South Africa / Eswatini region)
  CNY:         true,   // USDT <-> Cash CNY (China)
  GBP:         true,   // USDT <-> Cash GBP (UK)
  IDR:         false,  // USDT <-> Cash IDR (Indonesia) — enable when ready
  TZS:         true,   // USDT <-> Cash TZS (Tanzania)
  UZS:         true,   // USDT <-> Cash UZS (Uzbekistan)
  KGS:         true,   // USDT <-> Cash KGS (Kyrgyzstan)
}

// Per-direction min/max in FROM currency (USDT for sell side, fiat for buy side)
const LIMITS: Record<string, { min: number; max: number }> = {
  USDTTRC20: { min: 100,      max: 50000      }, // sending USDT min/max
  CASHUSD:   { min: 100,      max: 50000      },
  CASHAED:   { min: 400,      max: 200000     },
  CASHEUR:   { min: 100,      max: 50000      },
  CASHRUB:   { min: 10000,    max: 5000000    },
  CASHKZT:   { min: 50000,    max: 2000000    },
  CASHTRY:   { min: 3000,     max: 1500000    },
  CASHZAR:   { min: 2000,     max: 900000     },
  CASHCNY:   { min: 800,      max: 400000     },
  CASHGBP:   { min: 80,       max: 40000      },
  CASHIDR:   { min: 1500000,  max: 800000000  },
  CASHTZS:   { min: 250000,   max: 130000000  }, // TZS ~2600/USD
  CASHUZS:   { min: 1200000,  max: 630000000  }, // UZS ~12600/USD
  CASHKGS:   { min: 9000,     max: 4500000    }, // KGS ~90/USD
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface RateItem {
  from: string
  to: string
  in: number
  out: number
  amount: number
  minamount: number
  maxamount: number
  city?: string
  param?: string
}

// ─────────────────────────────────────────────
// LIVE RATES — fetched on every request (required by BestChange)
// Using open.er-api.com (free, no API key needed)
// Falls back to hardcoded rates if fetch fails
// ─────────────────────────────────────────────

const FALLBACK_RATES: Record<string, number> = {
  AED: 3.672,
  EUR: 0.920,
  RUB: 90.00,
  KZT: 450.0,
  TRY: 32.00,
  ZAR: 18.50,
  CNY: 7.250,
  GBP: 0.790,
  IDR: 16000,
  TZS: 2600,
  UZS: 12600,
  KGS: 90.00,
}

async function getLiveRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'app2cash-export/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Rate API error: ${res.status}`)
    const data = await res.json()
    if (!data.rates) throw new Error('No rates in response')
    return data.rates
  } catch (err) {
    console.error('[export] Rate fetch failed, using fallback:', err)
    return FALLBACK_RATES
  }
}

// ─────────────────────────────────────────────
// XML BUILDER
// ─────────────────────────────────────────────

function buildXML(items: RateItem[]): string {
  const itemsXML = items.map(item => {
    const lines = [
      `  <item>`,
      `    <from>${item.from}</from>`,
      `    <to>${item.to}</to>`,
      `    <in>${item.in}</in>`,
      `    <out>${item.out}</out>`,
      `    <amount>${item.amount.toFixed(2)}</amount>`,
      `    <minamount>${item.minamount}</minamount>`,
      `    <maxamount>${item.maxamount}</maxamount>`,
    ]
    if (item.city)  lines.push(`    <city>${item.city}</city>`)
    if (item.param) lines.push(`    <param>${item.param}</param>`)
    lines.push(`  </item>`)
    return lines.join('\n')
  }).join('\n')

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rates>`,
    itemsXML,
    `</rates>`,
  ].join('\n')
}

// ─────────────────────────────────────────────
// RATE HELPERS
// USDT ~$1.00. We model:
//   SELL USDT -> fiat: client gets fiat at (rate * BUY_MARGIN)
//   BUY  USDT <- fiat: client pays fiat at (rate * SELL_MARGIN)
// ─────────────────────────────────────────────

const round = (n: number, dp: number) => parseFloat(n.toFixed(dp))

function sellPair(
  fiatCode: string,
  rate: number,
  reserveUSDT: number,
  city?: string,
): RateItem {
  const BUY_MARGIN = 1 - MARGIN
  const out = round(rate * BUY_MARGIN, 4)
  const lim = LIMITS.USDTTRC20
  return {
    from: 'USDTTRC20',
    to: fiatCode,
    in: 1,
    out,
    amount: round(reserveUSDT * rate, 2),
    minamount: lim.min,
    maxamount: lim.max,
    city,
    param: 'manual',
  }
}

function buyPair(
  fiatCode: string,
  rate: number,
  reserveUSDT: number,
  city?: string,
): RateItem {
  const SELL_MARGIN = 1 + MARGIN
  const out = round(1 / (rate * SELL_MARGIN), 6)
  const lim = LIMITS[fiatCode] ?? { min: 100, max: 50000 }
  return {
    from: fiatCode,
    to: 'USDTTRC20',
    in: 1,
    out,
    amount: round(reserveUSDT, 2),
    minamount: lim.min,
    maxamount: lim.max,
    city,
    param: 'manual',
  }
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  try {
    const fx = await getLiveRates()

    const r = {
      AED: fx['AED'] ?? FALLBACK_RATES.AED,
      EUR: fx['EUR'] ?? FALLBACK_RATES.EUR,
      RUB: fx['RUB'] ?? FALLBACK_RATES.RUB,
      KZT: fx['KZT'] ?? FALLBACK_RATES.KZT,
      TRY: fx['TRY'] ?? FALLBACK_RATES.TRY,
      ZAR: fx['ZAR'] ?? FALLBACK_RATES.ZAR,
      CNY: fx['CNY'] ?? FALLBACK_RATES.CNY,
      GBP: fx['GBP'] ?? FALLBACK_RATES.GBP,
      IDR: fx['IDR'] ?? FALLBACK_RATES.IDR,
      TZS: fx['TZS'] ?? FALLBACK_RATES.TZS,
      UZS: fx['UZS'] ?? FALLBACK_RATES.UZS,
      KGS: fx['KGS'] ?? FALLBACK_RATES.KGS,
    }

    const items: RateItem[] = []

    // UAE (Dubai)
    if (ENABLED.UAE) {
      items.push(sellPair('CASHAED', r.AED, RESERVE_USDT, 'DUBAI'))
      items.push(buyPair('CASHAED',  r.AED, RESERVE_USDT, 'DUBAI'))
    }

    // Cash USD
    if (ENABLED.USD) {
      items.push(sellPair('CASHUSD', 1.0, RESERVE_USDT))
      items.push(buyPair('CASHUSD',  1.0, RESERVE_USDT))
    }

    // EUR (EU / Netherlands)
    if (ENABLED.EUR) {
      items.push(sellPair('CASHEUR', r.EUR, RESERVE_USDT))
      items.push(buyPair('CASHEUR',  r.EUR, RESERVE_USDT))
    }

    // Russia
    if (ENABLED.RUB) {
      items.push(sellPair('CASHRUB', r.RUB, RESERVE_USDT))
      items.push(buyPair('CASHRUB',  r.RUB, RESERVE_USDT))
    }

    // Kazakhstan
    if (ENABLED.KZT) {
      items.push(sellPair('CASHKZT', r.KZT, RESERVE_USDT))
      items.push(buyPair('CASHKZT',  r.KZT, RESERVE_USDT))
    }

    // Turkey
    if (ENABLED.TRY) {
      items.push(sellPair('CASHTRY', r.TRY, RESERVE_USDT))
      items.push(buyPair('CASHTRY',  r.TRY, RESERVE_USDT))
    }

    // South Africa / Eswatini region
    if (ENABLED.ZAR) {
      items.push(sellPair('CASHZAR', r.ZAR, RESERVE_USDT))
      items.push(buyPair('CASHZAR',  r.ZAR, RESERVE_USDT))
    }

    // China
    if (ENABLED.CNY) {
      items.push(sellPair('CASHCNY', r.CNY, RESERVE_USDT))
      items.push(buyPair('CASHCNY',  r.CNY, RESERVE_USDT))
    }

    // UK
    if (ENABLED.GBP) {
      items.push(sellPair('CASHGBP', r.GBP, RESERVE_USDT))
      items.push(buyPair('CASHGBP',  r.GBP, RESERVE_USDT))
    }

    // Indonesia
    if (ENABLED.IDR) {
      items.push(sellPair('CASHIDR', r.IDR, RESERVE_USDT))
      items.push(buyPair('CASHIDR',  r.IDR, RESERVE_USDT))
    }

    // Tanzania
    if (ENABLED.TZS) {
      items.push(sellPair('CASHTZS', r.TZS, RESERVE_USDT))
      items.push(buyPair('CASHTZS',  r.TZS, RESERVE_USDT))
    }

    // Uzbekistan
    if (ENABLED.UZS) {
      items.push(sellPair('CASHUZS', r.UZS, RESERVE_USDT))
      items.push(buyPair('CASHUZS',  r.UZS, RESERVE_USDT))
    }

    // Kyrgyzstan
    if (ENABLED.KGS) {
      items.push(sellPair('CASHKGS', r.KGS, RESERVE_USDT))
      items.push(buyPair('CASHKGS',  r.KGS, RESERVE_USDT))
    }

    const xml = buildXML(items)

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.status(200).send(xml)

  } catch (err) {
    console.error('[export] Fatal error:', err)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><rates></rates>')
  }
}
