import { NextResponse } from "next/server";
import { getGoldPriceWithStore } from "@/lib/gold";

export async function GET() {
  try {
    const data = await getGoldPriceWithStore();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[gold] Error:", error);
    return NextResponse.json({
      per10g: 7854,
      per1g: 785,
      silver_per1g: 91,
      source: "fallback",
    });
  }
}
