import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import prisma from "@/lib/db";

const PLAN_DURATION: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  master: 90,
};

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, amount } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    // Get user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Create subscription
    if (plan && PLAN_DURATION[plan]) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + PLAN_DURATION[plan]);

      await prisma.subscription.upsert({
        where: { userId: dbUser.id },
        update: {
          plan,
          status: "active",
          startDate: new Date(),
          endDate,
          paymentId: razorpay_payment_id,
          amount: amount || 0,
        },
        create: {
          userId: dbUser.id,
          plan,
          status: "active",
          startDate: new Date(),
          endDate,
          paymentId: razorpay_payment_id,
          amount: amount || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error: any) {
    console.error("[razorpay/verify] Error:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
