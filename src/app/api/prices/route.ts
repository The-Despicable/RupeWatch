import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getGoldPriceINR, storeGoldPrice } from "@/lib/gold";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any = { timestamp: new Date().toISOString(), updated: [] };

  try {
    // 1. Update Gold
    try {
      const gold = await getGoldPriceINR();
      await storeGoldPrice(gold.price, gold.source);
      results.updated.push({ asset: "XAU/INR", price: gold.price, source: gold.source });
    } catch (e) {
      results.errors = results.errors || [];
      results.errors.push({ asset: "XAU/INR", error: (e as Error).message });
    }

    // 2. Update Currency Rates (from currency-api CDN)
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      
      if (res.ok) {
        const data = await res.json();
        const { inr, eur, gbp, sar } = data.usd;

        const currencies = [
          { base: "USD", target: "INR", rate: inr },
          { base: "EUR", target: "INR", rate: inr / eur },
          { base: "GBP", target: "INR", rate: inr / gbp },
          { base: "SAR", target: "INR", rate: inr / sar },
        ];

        for (const c of currencies) {
          await prisma.rateHistory.create({
            data: {
              base: c.base,
              target: c.target,
              rate: c.rate,
              source: "currency-api",
            },
          });
          results.updated.push({ asset: `${c.base}/${c.target}`, price: c.rate, source: "currency-api" });
        }
      }
    } catch (e) {
      results.errors = results.errors || [];
      results.errors.push({ asset: "currencies", error: (e as Error).message });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[prices/update] Fatal error:", error);
    return NextResponse.json(
      { error: "Update failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint to update all prices",
    auth: "Bearer token in Authorization header (use CRON_SECRET env var)",
    example: "curl -X POST -H 'Authorization: Bearer $CRON_SECRET' /api/prices",
  });
}
