import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const recent = await prisma.rateHistory.findMany({
    orderBy: { timestamp: "desc" },
    take: 20,
  });
  return NextResponse.json(recent);
}
