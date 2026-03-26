import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { callDeepSeek } from "@/lib/deepseek";
import {
  getCurrentPrice,
  getPricePair,
  getRecentPrices,
  evaluateCondition,
  buildAIPrompt,
  parseAIResponse,
} from "@/lib/priceFetcher";
import { sendAlertNotification } from "@/lib/telegram";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { isActive: true },
      include: { user: { select: { telegramChatId: true, email: true } } },
    });

    if (alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0 });
    }

    const results = {
      checked: 0,
      triggered: 0,
      skipped: 0,
      aiDeclined: 0,
      errors: [] as string[],
      details: [] as {
        alertId: string;
        asset: string;
        currentPrice: number | null;
        conditionMet: boolean;
        aiTriggered: boolean;
        aiReason?: string;
        notified?: boolean;
      }[],
    };

    for (const alert of alerts) {
      results.checked++;

      try {
        const currentPrice = await getCurrentPrice(alert.asset);

        if (currentPrice === null) {
          results.skipped++;
          results.details.push({
            alertId: alert.id,
            asset: alert.asset,
            currentPrice: null,
            conditionMet: false,
            aiTriggered: false,
          });
          continue;
        }

        const conditionMet = evaluateCondition(currentPrice, alert.condition, alert.targetPrice);

        if (!conditionMet) {
          let progress = 0;
          const diff = Math.abs(currentPrice - alert.targetPrice);
          const percentage = (diff / alert.targetPrice) * 100;

          if (alert.condition === "below") {
            progress = currentPrice < alert.targetPrice 
              ? Math.max(0, 100 - percentage)
              : Math.max(0, 50 - percentage / 2);
          } else if (alert.condition === "above") {
            progress = currentPrice > alert.targetPrice 
              ? Math.min(100, 50 + (100 - percentage))
              : Math.max(0, percentage / 2);
          }

          await prisma.alert.update({
            where: { id: alert.id },
            data: { progress: Math.min(100, Math.max(0, progress)) },
          });

          results.details.push({
            alertId: alert.id,
            asset: alert.asset,
            currentPrice,
            conditionMet: false,
            aiTriggered: false,
          });
          continue;
        }

        const pair = getPricePair(alert.asset);
        const recentPrices = await getRecentPrices(pair, 8);
        const prompt = buildAIPrompt(
          alert.asset,
          alert.condition,
          alert.targetPrice,
          currentPrice,
          recentPrices
        );

        let aiTriggered = false;
        let aiReason = "";
        let notified = false;

        try {
          const aiResponse = await callDeepSeek(prompt);
          const parsed = parseAIResponse(aiResponse);
          aiTriggered = parsed.shouldTrigger;
          aiReason = parsed.reason;

          if (aiTriggered) {
            await prisma.alert.update({
              where: { id: alert.id },
              data: {
                isActive: false,
                triggeredAt: new Date(),
                notifiedAt: new Date(),
              },
            });
            results.triggered++;

            if (alert.user.telegramChatId) {
              const notifResult = await sendAlertNotification(
                alert.user.telegramChatId,
                alert.asset,
                alert.condition,
                alert.targetPrice,
                currentPrice
              );
              notified = notifResult.success;
              console.log(`[alert/check] Telegram notification for alert ${alert.id}:`, notifResult);
            }
          } else {
            results.aiDeclined++;
          }
        } catch (aiError) {
          console.error(`[alert/check] AI error for alert ${alert.id}:`, aiError);
          aiReason = "AI unavailable - auto-triggering";
          aiTriggered = true;

          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              isActive: false,
              triggeredAt: new Date(),
              notifiedAt: new Date(),
            },
          });
          results.triggered++;

          if (alert.user.telegramChatId) {
            const notifResult = await sendAlertNotification(
              alert.user.telegramChatId,
              alert.asset,
              alert.condition,
              alert.targetPrice,
              currentPrice
            );
            notified = notifResult.success;
          }
        }

        results.details.push({
          alertId: alert.id,
          asset: alert.asset,
          currentPrice,
          conditionMet: true,
          aiTriggered,
          aiReason,
          notified,
        });

      } catch (alertError) {
        console.error(`[alert/check] Error processing alert ${alert.id}:`, alertError);
        results.errors.push(`Alert ${alert.id}: ${(alertError as Error).message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[alert/check] Fatal error:", error);
    return NextResponse.json(
      { error: "Alert check failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint with cron job to check alerts",
    auth: "Bearer token in Authorization header (use CRON_SECRET env var)",
    example: "curl -X POST -H 'Authorization: Bearer $CRON_SECRET' /api/alerts/check",
  });
}
