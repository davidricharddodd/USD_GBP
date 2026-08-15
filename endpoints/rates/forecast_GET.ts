import { schema, OutputType } from "./forecast_GET.schema";
import superjson from "superjson";
import { db } from "../../helpers/db";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    schema.parse(query);

    // 1. Check existing active forecast
    const now = new Date();
    const existingForecast = await db
      .selectFrom("fxForecasts")
      .selectAll()
      .where("expiresAt", ">", now)
      .orderBy("createdAt", "desc")
      .limit(1)
      .executeTakeFirst();

    if (existingForecast) {
      return new Response(
        superjson.stringify({
          confidencePct: existingForecast.confidencePct,
          direction: existingForecast.direction,
          summary: existingForecast.summary,
          ratePath: (typeof existingForecast.ratePath === 'string' ? JSON.parse(existingForecast.ratePath) : existingForecast.ratePath) as OutputType["ratePath"],
          keyEvents: (typeof existingForecast.keyEvents === 'string' ? JSON.parse(existingForecast.keyEvents) : existingForecast.keyEvents) as OutputType["keyEvents"],
          targetRangeLow: parseFloat(existingForecast.targetRangeLow as string),
          targetRangeHigh: parseFloat(existingForecast.targetRangeHigh as string),
          generatedAt: existingForecast.createdAt.toISOString(),
        } satisfies OutputType)
      );
    }

    // 2. Fetch last 30 days of rates to seed the AI
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const history = await db
      .selectFrom("exchangeRates")
      .select(["rate", "fetchedAt"])
      .where("fetchedAt", ">=", thirtyDaysAgo)
      .orderBy("fetchedAt", "asc")
      .execute();

    if (history.length === 0) {
      throw new Error("Not enough historical data to generate forecast");
    }

    // Convert USD->GBP rates from DB into GBP->USD rates for the prompt
    const rateHistoryGbpUsd = history.map((h) => ({
      date: h.fetchedAt.toISOString().split("T")[0],
      rate: 1 / parseFloat(h.rate as string),
    }));

    const currentRateGbpUsd = rateHistoryGbpUsd[rateHistoryGbpUsd.length - 1].rate;

    // 3. Call Anthropic API
    const prompt = `
You are a senior G10 FX strategist at a top-tier investment bank.
Provide a 30-day forecast for GBP/USD based on the following recent rate history. Be realistic, not overly optimistic. Consider central bank policies (BoE, Fed), upcoming economic data, geopolitical risks, and market positioning.

Today's Date: ${now.toISOString().split("T")[0]}
Current GBP/USD Rate: ${currentRateGbpUsd.toFixed(4)}
Last 30 days of GBP/USD rates:
${JSON.stringify(rateHistoryGbpUsd)}

Return ONLY a valid JSON object matching the exact structure below, with no markdown formatting or extra text:
{
  "confidencePct": 85,
  "direction": "bullish",
  "summary": "2-3 paragraphs of institutional quality macro analysis written like a bank strategist report...",
  "ratePath": [
    { "date": "YYYY-MM-DD", "rate": 1.3400, "upper": 1.3500, "lower": 1.3300 } // exactly 30 items for the next 30 days
  ],
  "keyEvents": [
    { "event": "BoE Rate Decision", "dateWindow": "Mid-Nov", "impact": "Hawkish hold expected...", "direction": "gbp_positive", "magnitude": "High" } // exactly 3 items. direction must be "gbp_positive" or "gbp_negative"
  ],
  "targetRangeLow": 1.3200,
  "targetRangeHigh": 1.3600
}
`;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.text();
      console.error("Anthropic API Error:", err);
      throw new Error("Failed to generate AI forecast");
    }

    const anthropicData = await anthropicResponse.json();
    let textResponse = anthropicData.content[0].text;
    
    // Clean up potential markdown formatting
    textResponse = textResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsedForecast = JSON.parse(textResponse);

    // 4. Save to database
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    
    const inserted = await db
      .insertInto("fxForecasts")
      .values({
        confidencePct: parsedForecast.confidencePct,
        currentRateAtForecast: currentRateGbpUsd.toString(),
        direction: parsedForecast.direction,
        summary: parsedForecast.summary,
        ratePath: JSON.stringify(parsedForecast.ratePath),
        keyEvents: JSON.stringify(parsedForecast.keyEvents),
        targetRangeLow: parsedForecast.targetRangeLow.toString(),
        targetRangeHigh: parsedForecast.targetRangeHigh.toString(),
        expiresAt: expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // 5. Return response
    return new Response(
      superjson.stringify({
        confidencePct: inserted.confidencePct,
        direction: inserted.direction,
        summary: inserted.summary,
        ratePath: parsedForecast.ratePath,
        keyEvents: parsedForecast.keyEvents,
        targetRangeLow: parseFloat(inserted.targetRangeLow as string),
        targetRangeHigh: parseFloat(inserted.targetRangeHigh as string),
        generatedAt: inserted.createdAt.toISOString(),
      } satisfies OutputType)
    );
  } catch (error: any) {
    console.error("Forecast Endpoint Error:", error);
    return new Response(superjson.stringify({ error: error.message }), {
      status: 400,
    });
  }
}