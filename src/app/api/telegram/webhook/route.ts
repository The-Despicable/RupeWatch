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

async function getPrices(asset?: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/gold`);
    const goldData = await res.json();
    
    const ratesRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/rates`);
    const ratesData = await ratesRes.json();

    if (asset) {
      const assetUpper = asset.toUpperCase();
      if (assetUpper.includes("GOLD") || assetUpper.includes("24K")) {
        return `🥇 <b>Gold Price</b>\n` +
          `24K (10g): ₹${goldData.price_10g_24k?.toLocaleString("en-IN") || "N/A"}\n` +
          `22K (10g): ₹${goldData.price_10g_22k?.toLocaleString("en-IN") || "N/A"}\n` +
          `24K (1g): ₹${goldData.price_1g_24k?.toLocaleString("en-IN") || "N/A"}`;
      } else if (assetUpper.includes("SILVER")) {
        return `🥈 <b>Silver Price</b>\n` +
          `1kg: ₹${goldData.price_kg_silver?.toLocaleString("en-IN") || "N/A"}\n` +
          `10g: ₹${goldData.price_10g_silver?.toLocaleString("en-IN") || "N/A"}`;
      } else {
        const rate = ratesData[assetUpper];
        if (rate) {
          return `💱 <b>${assetUpper}/INR</b>\n` +
            `Rate: ₹${typeof rate === "number" ? rate.toFixed(4) : "N/A"}`;
        }
      }
    }

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
      const args = parts.slice(1).join(" ");

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
            `/price [gold|silver|USD] - Get current price\n` +
            `/alerts - View your active alerts\n` +
            `/status - Check subscription\n\n` +
            `Set up alerts: rupewatch.app/dashboard`
          );
          break;

        case "/price":
          const priceInfo = await getPrices(args);
          await sendTelegramMessage(chatId, priceInfo);
          break;

        case "/gold":
          await sendTelegramMessage(chatId, await getPrices("gold"));
          break;

        case "/silver":
          await sendTelegramMessage(chatId, await getPrices("silver"));
          break;

        case "/rates":
          await sendTelegramMessage(chatId, await getPrices());
          break;

        case "/status": {
          const user = await prisma.user.findUnique({
            where: { telegramChatId: chatId },
            include: {
              subscription: true,
              alerts: {
                where: { isActive: true },
                take: 5,
              },
            },
          });

          if (!user) {
            await sendTelegramMessage(
              chatId,
              "⚠️ Your Telegram isn't linked to any account.\n\n" +
              "Visit rupewatch.app and connect your Telegram in Settings."
            );
          } else {
            const subStatus = user.subscription
              ? `✅ <b>Active</b> (${user.subscription.plan})\nExpires: ${new Date(user.subscription.endDate).toLocaleDateString("en-IN")}`
              : "❌ <b>No active subscription</b>";

            const activeAlerts = user.alerts.length;
            const alertList =
              activeAlerts > 0
                ? user.alerts.map((a) => `• ${a.asset} ${a.condition} ₹${a.targetPrice.toLocaleString("en-IN")}`).join("\n")
                : "No active alerts";

            await sendTelegramMessage(
              chatId,
              `📊 <b>Your Status</b>\n\n` +
              `👤 ${escapeHtml(user.email)}\n\n` +
              `💳 Subscription:\n${subStatus}\n\n` +
              `🔔 Active Alerts (${activeAlerts}):\n${alertList}`
            );
          }
          break;
        }

        case "/alerts": {
          const user = await prisma.user.findUnique({
            where: { telegramChatId: chatId },
            include: {
              alerts: {
                where: { isActive: true },
                take: 10,
              },
            },
          });

          if (!user) {
            await sendTelegramMessage(
              chatId,
              "⚠️ Your Telegram isn't linked to any account.\n\n" +
              "Visit rupewatch.app/settings to connect."
            );
          } else if (user.alerts.length === 0) {
            await sendTelegramMessage(
              chatId,
              "🔔 <b>Your Alerts</b>\n\nNo active alerts.\n\n" +
              "Create one at: rupewatch.app/alerts"
            );
          } else {
            const alertsList = user.alerts
              .map((a, i) => `${i + 1}. ${a.asset} ${a.condition} ₹${a.targetPrice.toLocaleString("en-IN")}`)
              .join("\n");
            await sendTelegramMessage(
              chatId,
              `🔔 <b>Your Active Alerts</b>\n\n${alertsList}\n\n` +
              `Total: ${user.alerts.length} alert(s)\n` +
              `Manage: rupewatch.app/alerts`
            );
          }
          break;
        }

        case "/id":
          await sendTelegramMessage(
            chatId,
            `🆔 <b>Your Chat ID:</b>\n\n<code>${chatId}</code>\n\n` +
            `Use this in the RupeWatch settings to connect.`
          );
          break;

        default:
          await sendTelegramMessage(
            chatId,
            "❓ Unknown command.\n\n" +
            "Available commands:\n" +
            "/start - Help\n" +
            "/price - Get prices\n" +
            "/status - Check account\n" +
            "/alerts - View alerts\n" +
            "/id - Get your Chat ID"
          );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (mode === "setwebhook" && token === process.env.CRON_SECRET && botToken) {
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    info: "Telegram webhook endpoint",
    setup: "POST ?mode=setwebhook&token=<CRON_SECRET>&url=<webhook_url>",
    commands: ["/start", "/help", "/price", "/gold", "/silver", "/rates", "/status", "/alerts", "/id"],
  });
}
