import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

const PLAN_DURATION: Record<string, number> = {
  weekly: 7,    // days
  monthly: 30,   // days
  master: 90,   // days (3 months)
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { subscription: true },
    });

    if (!dbUser) {
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({ subscription: dbUser.subscription });
  } catch (error) {
    console.error("[subscription/get] Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, paymentId, amount } = await req.json();

    if (!plan || !PLAN_DURATION[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DURATION[plan]);

    const subscription = await prisma.subscription.upsert({
      where: { userId: dbUser.id },
      update: {
        plan,
        status: "active",
        startDate: new Date(),
        endDate,
        paymentId: paymentId || null,
        amount: amount || 0,
      },
      create: {
        userId: dbUser.id,
        plan,
        status: "active",
        startDate: new Date(),
        endDate,
        paymentId: paymentId || null,
        amount: amount || 0,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("[subscription/create] Error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
