const TELEGRAM_API_URL = "https://api.telegram.org";

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  disable_web_page_preview?: boolean;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "MarkdownV2" | "HTML" = "HTML"
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("[Telegram] Bot token not configured");
    return { success: false, error: "Telegram bot not configured" };
  }

  if (!chatId) {
    return { success: false, error: "No chat ID provided" };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("[Telegram] Send failed:", data);
      return {
        success: false,
        error: data.description || "Failed to send message",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function setWebhook(url: string): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { success: false, error: "Telegram bot not configured" };
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_URL}/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatAlertNotification(
  asset: string,
  condition: string,
  targetPrice: number,
  currentPrice: number
): string {
  const assetLabel = getAssetLabel(asset);
  const conditionText = condition === "above" ? "📈 rose above" : "📉 fell below";
  
  const emoji = asset.includes("GOLD") ? "🥇" : asset.includes("SILVER") ? "🥈" : "💱";
  
  return `
${emoji} <b>Alert Triggered!</b>

<b>${assetLabel}</b> ${conditionText} your target!

📊 Target: ₹${targetPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
📈 Current: ₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}

Checked by RupeWatch • ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
`.trim();
}

function getAssetLabel(asset: string): string {
  const labels: Record<string, string> = {
    GOLD_10G: "Gold (10g)",
    GOLD_1G: "Gold (1g)",
    SILVER_1KG: "Silver (1kg)",
    SILVER_10G: "Silver (10g)",
    USDINR: "USD/INR",
    EURINR: "EUR/INR",
    GBPINR: "GBP/INR",
    JPYINR: "JPY/INR",
    AUDINR: "AUD/INR",
    CADINR: "CAD/INR",
  };
  return labels[asset] || asset;
}

export async function sendAlertNotification(
  chatId: string,
  asset: string,
  condition: string,
  targetPrice: number,
  currentPrice: number
): Promise<{ success: boolean; error?: string }> {
  const message = formatAlertNotification(asset, condition, targetPrice, currentPrice);
  return sendTelegramMessage(chatId, message);
}
