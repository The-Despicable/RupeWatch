import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/user";

// GET /api/alerts — list the authenticated user's active alerts
export async function GET() {
  try {
    const user = await getOrCreateDbUser();

    const alerts = await prisma.alert.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(alerts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/alerts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/alerts — create a new alert
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateDbUser();

    const body = await req.json();
    const { asset, category, icon, targetPrice, condition, color } = body;

    // Basic validation
    if (!asset || !targetPrice || !condition) {
      return NextResponse.json(
        { error: "Missing required fields: asset, targetPrice, condition" },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        asset,
        category: category ?? asset,
        icon: icon ?? "notifications",
        targetPrice: parseFloat(targetPrice),
        condition, // "below" | "above" | "equals"
        color: color ?? "primary-container",
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/alerts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
