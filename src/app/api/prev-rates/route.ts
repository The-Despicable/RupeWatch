import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split('T')[0];

    const urls = [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yDate}/v1/currencies/usd.min.json`,
      `https://${yDate}.currency-api.pages.dev/v1/currencies/usd.min.json`,
    ];

    let data: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) { data = await res.json(); break; }
      } catch { /* try next */ }
    }
    if (!data) throw new Error('All sources failed');

    const { inr, eur, gbp, sar } = data.usd;

    return NextResponse.json({
      USD: inr,
      EUR: inr / eur,
      GBP: inr / gbp,
      SAR: inr / sar,
    });
  } catch (error) {
    console.error('[prev-rates] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch previous rates' }, { status: 500 });
  }
}
