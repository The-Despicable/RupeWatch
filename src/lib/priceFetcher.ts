import prisma from "./db";

interface PriceResult {
  price: number;
  pair: string;
}

const PAIR_MAPPING: Record<string, string> = {
  "USD/INR": "USDINR",
  "EUR/INR": "EURINR",
  "GBP/INR": "GBPINR",
  "SAR/INR": "SARINR",
  "Gold": "GOLD_INR",
  "Gold 24K": "GOLD_INR",
  "Silver": "SILVER_INR",
  "Petrol": "PETROL_INR",
  "Brent Crude": "PETROL_INR",
};

export function getPricePair(asset: string): string {
  return PAIR_MAPPING[asset] || `${asset.replace("/", "")}_INR`;
}

export async function getCurrentPrice(asset: string): Promise<number | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    if (asset.includes("Gold") || asset === "Gold 24K") {
      const res = await fetch(`${baseUrl}/api/gold`, { 
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.per10g || null;
      }
    }

    if (asset.includes("Silver")) {
      const res = await fetch(`${baseUrl}/api/gold`, { 
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.silver_per1g || null;
      }
    }

    // For currencies, extract just the base currency code
    const currencyCode = asset.split("/")[0];
    
    const res = await fetch(`${baseUrl}/api/rates`, { 
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = data[currencyCode];
      if (price !== undefined) return price;
    }

    return null;
  } catch (error) {
    console.error(`[priceFetcher] Error fetching ${asset}:`, error);
    return null;
  }
}

export async function getRecentPrices(pair: string, limit = 10): Promise<number[]> {
  try {
    const records = await prisma.rateHistory.findMany({
      where: { 
        OR: [
          { base: pair },
          { target: pair },
        ]
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return records.map((r) => r.rate).reverse();
  } catch (error) {
    console.error(`[priceFetcher] Error fetching history for ${pair}:`, error);
    return [];
  }
}

export function evaluateCondition(current: number, condition: string, target: number): boolean {
  switch (condition) {
    case "below":
    case "<":
      return current < target;
    case "above":
    case ">":
      return current > target;
    case "equals":
    case "=":
      return Math.abs(current - target) < 0.01;
    default:
      return false;
  }
}

export function buildAIPrompt(
  asset: string,
  condition: string,
  targetPrice: number,
  currentPrice: number,
  history: number[]
): string {
  const recentPricesStr = history.length > 0 
    ? history.join(" → ") 
    : "No recent data available";

  return `You are a financial alert assistant that filters false alerts.

Alert condition: ${asset} ${condition} ₹${targetPrice}
Current price: ₹${currentPrice.toFixed(2)}
Recent prices (oldest to newest): ${recentPricesStr}

Based on the recent price trend and the current price movement, is this alert worth triggering? 
Answer ONLY with "YES" or "NO" followed by a short reason (max 50 characters).`;
}

export function parseAIResponse(response: string): { shouldTrigger: boolean; reason: string } {
  const trimmed = response.trim().toUpperCase();
  const shouldTrigger = /^YES/i.test(trimmed);
  const reason = response.replace(/^(YES|NO)\s*/i, "").trim();
  
  return { shouldTrigger, reason };
}
