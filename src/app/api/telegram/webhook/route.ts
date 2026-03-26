import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string; username?: string };
  };
}

async function getPrices() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rupewatch.vercel.app";
    const res = await fetch(`${baseUrl}/api/gold`, { next: { revalidate: 60 } });
    const goldData = await res.json();
    
    const ratesRes = await fetch(`${baseUrl}/api/rates`, { next: { revalidate: 60 } });
    const ratesData = await ratesRes.json();

    return `📊 <b>Current Prices</b>\n\n` +
      `🥇 Gold 24K (10g): ₹${goldData.price_10g_24k?.toLocaleString("en-IN") || "N/A"}\n` +
      `🥈 Silver (1kg): ₹${goldData.price_kg_silver?.toLocaleString("en-IN") || "N/A"}\n\n` +
      `💱 Exchange Rates:\n` +
      `USD: ₹${ratesData.USD?.toFixed(4) || "N/A"}\n` +
      `EUR: ₹${ratesData.EUR?.toFixed(4) || "N/A"}\n` +
      `GBP: ₹${ratesData.GBP?.toFixed(4) || "N/A"}\n` +
      `SAR: ₹${ratesData.SAR?.toFixed(4) || "N/A"}`;
  } catch (error) {
    return "⚠️ Unable to fetch prices. Try again later.";
  }
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  try {
    const update: TelegramUpdate = await req.json();

    if (update.message) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text || "";
      const firstName = escapeHtml(update.message.from?.first_name || "User");
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();

      switch (command) {
        case "/start":
        case "/help":
          await sendTelegramMessage(
            chatId,
            `👋 Hello ${firstName}!\n\n` +
            `Welcome to <b>RupeWatch Alerts</b>!\n\n` +
            `I'll notify you when your price alerts are triggered.\n\n` +
            `📋 <b>Commands:</b>\n` +
            `/start - Show this message\n` +
            `/price - Get current prices\n` +
            `/alerts - View your active alerts\n` +
            `/status - Check subscription\n\n` +
            `Set up alerts: rupewatch.vercel.app/dashboard`
          );
          break;

        case "/price":
        case "/rates":
          await sendTelegramMessage(chatId, await getPrices());
          break;

        case "/status": {
          const user = await prisma.user.findUnique({
            where: { telegramChatId: chatId },
            include: {
              subscription: true,
              alerts: { where: { isActive: true }, take: 5 },
            },
          });

          if (!user) {
            await sendTelegramMessage(
              chatId,
              "⚠️ Your Telegram isn't linked.\n\n" +
              "Visit rupewatch.vercel.app/settings"
            );
          } else {
            const subStatus = user.subscription
              ? `✅ Active (${user.subscription.plan})\nExpires: ${new Date(user.subscription.endDate).toLocaleDateString("en-IN")}`
              : "❌ No active subscription";

            await sendTelegramMessage(
              chatId,
              `📊 <b>Your Status</b>\n\n` +
              `👤 ${escapeHtml(user.email)}\n\n` +
              `💳 Subscription:\n${subStatus}\n\n` +
              `🔔 Active Alerts: ${user.alerts.length}`
            );
          }
          break;
        }

        case "/alerts": {
          const user = await prisma.user.findUnique({
            where: { telegramChatId: chatId },
            include: { alerts: { where: { isActive: true }, take: 10 } },
          });

          if (!user || user.alerts.length === 0) {
            await sendTelegramMessage(
              chatId,
              "🔔 No active alerts.\n\nCreate at: rupewatch.vercel.app/alerts"
            );
          } else {
            const list = user.alerts
              .map((a, i) => `${i + 1}. ${a.asset} ${a.condition} ₹${a.targetPrice.toLocaleString("en-IN")}`)
              .join("\n");
            await sendTelegramMessage(chatId, `🔔 <b>Your Alerts</b>\n\n${list}`);
          }
          break;
        }

        case "/id":
          await sendTelegramMessage(chatId, `🆔 Your Chat ID:\n\n<code>${chatId}</code>\n\nUse this in settings.`);
          break;

        default:
          await sendTelegramMessage(
            chatId,
            "❓ Commands:\n/start - Help\n/price - Prices\n/status - Account\n/alerts - View alerts\n/id - Your Chat ID"
          );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "RupeWatch Telegram Bot Webhook",
    commands: ["/start", "/price", "/status", "/alerts", "/id"],
  });
}
