import { schema, OutputType } from "./current_GET.schema";
import superjson from "superjson";
import { db } from "../../helpers/db";

async function sendTelegramNotification(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.warn("Telegram credentials missing, skipping notification");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    if (!response.ok) {
      console.error("Failed to send Telegram notification:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    let currentRate: number | null = null;
    let fetchedAt: Date = new Date();

    // Check recent rates
    const recentRate = await db
      .selectFrom("exchangeRates")
      .select(["rate", "fetchedAt"])
      .where("fetchedAt", ">=", thirtyMinsAgo)
      .orderBy("fetchedAt", "desc")
      .limit(1)
      .executeTakeFirst();

    if (recentRate) {
      currentRate = parseFloat(recentRate.rate as string);
      fetchedAt = recentRate.fetchedAt;
    } else {
      // Fetch from API
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!response.ok) {
        throw new Error("Failed to fetch rates from API");
      }
      const data = await response.json();
      currentRate = data.rates.GBP;
      fetchedAt = new Date();

      if (typeof currentRate !== "number") {
        throw new Error("Invalid rate returned from API");
      }

      await db
        .insertInto("exchangeRates")
        .values({
          rate: currentRate,
          fetchedAt: fetchedAt,
        })
        .execute();
    }

    // Compute GBP→USD rate for alert comparisons (alerts are stored in GBP→USD terms)
    const gbpToUsdRate = 1 / currentRate;

    // Check active alerts
    const activeAlerts = await db
      .selectFrom("rateAlerts")
      .selectAll()
      .where("isActive", "=", true)
      .execute();

    const triggeredAlerts: OutputType["triggeredAlerts"] = [];

    for (const alert of activeAlerts) {
      const targetRate = parseFloat(alert.targetRate as string);
      let isTriggered = false;

      // Compare GBP→USD rate against the target (alerts are set in GBP→USD terms)
      if (alert.direction === "at_or_below" && gbpToUsdRate <= targetRate) {
        isTriggered = true;
      } else if (alert.direction === "at_or_above" && gbpToUsdRate >= targetRate) {
        isTriggered = true;
      }

      if (isTriggered) {
        await db
          .updateTable("rateAlerts")
          .set({
            isActive: false,
            triggeredAt: new Date(),
          })
          .where("id", "=", alert.id)
          .execute();

        const convertedLumpSum = 90000 * currentRate!;
        const directionText = alert.direction === "at_or_above" ? "at or above" : "at or below";
        const message = `🚨 *Rate Alert Triggered!*\n\n` +
          `Current GBP/USD Rate: *${gbpToUsdRate.toFixed(4)}*\n` +
          `Target: ${directionText} *${targetRate.toFixed(4)}*\n\n` +
          `Conversion of $90,000 USD -> *£${convertedLumpSum.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`;

        await sendTelegramNotification(message);

        triggeredAlerts.push({
          id: alert.id,
          targetRate,
          direction: alert.direction,
        });
      }
    }

    return new Response(
      superjson.stringify({
        rate: currentRate,
        fetchedAt: fetchedAt.toISOString(),
        triggeredAlerts,
      } satisfies OutputType)
    );
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), {
      status: 400,
    });
  }
}