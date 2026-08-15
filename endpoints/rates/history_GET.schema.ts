import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  days: z.coerce.number().min(1).max(90).default(7),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  rates: {
    rate: number;
    fetchedAt: string;
  }[];
};

export const getRateHistory = async (
  query: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const searchParams = new URLSearchParams();
  if (query.days !== undefined) {
    searchParams.set("days", query.days.toString());
  }

  const result = await fetch(`/_api/rates/history?${searchParams.toString()}`, {
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