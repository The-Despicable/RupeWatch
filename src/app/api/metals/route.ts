import { NextResponse } from 'next/server';

const FALLBACK_DATA = {
  gold: { price: 2341.84, change24h: 1.24, prevClose: 2312.45, dayHigh: 2345.12, dayLow: 2310.20 },
  silver: { price: 28.42, change24h: 0.85, prevClose: 28.18, dayHigh: 28.65, dayLow: 28.10 },
  petrol: { price: 84.15, change24h: -0.42, prevClose: 84.50, dayHigh: 85.20, dayLow: 83.80 },
};

export async function GET() {
  const apiKey = process.env.GOLDAPI_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ ...FALLBACK_DATA, source: 'fallback', message: 'Using fallback data' });
  }

  try {
    const headers = {
      'x-access-token': apiKey,
      'Content-Type': 'application/json',
    };

    const [goldRes, silverRes] = await Promise.allSettled([
      fetch('https://www.goldapi.io/api/XAU/USD', { headers, cache: 'no-store' }),
      fetch('https://www.goldapi.io/api/XAG/USD', { headers, cache: 'no-store' }),
    ]);

    const result: any = { source: 'api' };

    if (goldRes.status === 'fulfilled' && goldRes.value.ok) {
      const gold = await goldRes.value.json();
      result.gold = {
        price: gold.price,
        change24h: gold.ch / gold.price * 100,
        prevClose: gold.ch,
        dayHigh: gold.high,
        dayLow: gold.low,
      };
    }

    if (silverRes.status === 'fulfilled' && silverRes.value.ok) {
      const silver = await silverRes.value.json();
      result.silver = {
        price: silver.price,
        change24h: silver.ch / silver.price * 100,
        prevClose: silver.ch,
        dayHigh: silver.high,
        dayLow: silver.low,
      };
    }

    if (!result.gold) result.gold = FALLBACK_DATA.gold;
    if (!result.silver) result.silver = FALLBACK_DATA.silver;
    result.petrol = FALLBACK_DATA.petrol;

    return NextResponse.json(result);
  } catch (error) {
    console.error('[metals] Error:', error);
    return NextResponse.json({ ...FALLBACK_DATA, source: 'fallback', error: 'API failed' });
  }
}
