import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { telegramChatId: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      telegramConnected: !!user.telegramChatId,
      telegramChatId: user.telegramChatId,
    });
  } catch (error) {
    console.error("[telegram/settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { chatId, action } = await req.json();

    if (action === "disconnect") {
      await prisma.user.update({
        where: { clerkId },
        data: { telegramChatId: null },
      });
      return NextResponse.json({ success: true, message: "Telegram disconnected" });
    }

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    const result = await sendTelegramMessage(
      chatId,
      "✅ <b>RupeWatch Connected!</b>\n\nYou'll receive price alerts here. Reply /status to check your subscription."
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to connect Telegram" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { clerkId },
      data: { telegramChatId: chatId },
    });

    return NextResponse.json({
      success: true,
      message: "Telegram connected successfully",
    });
  } catch (error) {
    console.error("[telegram/settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
