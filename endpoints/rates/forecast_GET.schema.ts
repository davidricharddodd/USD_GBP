import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type ForecastRatePoint = {
  date: string;
  rate: number;
  upper: number;
  lower: number;
};

export type ForecastKeyEvent = {
  event: string;
  dateWindow: string;
  impact: string;
  direction: "gbp_positive" | "gbp_negative";
  magnitude: string;
};

export type OutputType = {
  confidencePct: number;
  direction: "bullish" | "bearish" | "neutral";
  summary: string;
  ratePath: ForecastRatePoint[];
  keyEvents: ForecastKeyEvent[];
  targetRangeLow: number;
  targetRangeHigh: number;
  generatedAt: string;
};

export const getForecast = async (
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/rates/forecast`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};