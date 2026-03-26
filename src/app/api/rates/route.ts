import { NextResponse } from 'next/server';

export async function GET() {
  // Strategy 1: fawazahmed0 CDN (primary)
  try {
    const urls = [
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
      'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json',
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const { inr, eur, gbp, sar } = data.usd;
          return NextResponse.json({
            USD: inr,
            EUR: inr / eur,
            GBP: inr / gbp,
            SAR: inr / sar,
          });
        }
      } catch (e) {
        console.error('[rates] CDN source failed:', url, e);
      }
    }
  } catch (e) {
    console.error('[rates] CDN strategy failed:', e);
  }

  // Strategy 2: Frankfurter API (fallback)
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?base=USD&symbols=INR,EUR,GBP,SAR',
      { cache: 'no-store', signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const { INR, EUR, GBP, SAR } = data.rates;
      return NextResponse.json({
        USD: INR,
        EUR: INR / EUR,
        GBP: INR / GBP,
        SAR: INR / SAR,
      });
    }
  } catch (e) {
    console.error('[rates] Frankfurter fallback failed:', e);
  }

  console.error('[rates] All sources failed');
  return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
}
