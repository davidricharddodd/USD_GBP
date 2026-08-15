import { z } from "zod";
import superjson from "superjson";
import { AlertDirectionArrayValues } from "../../helpers/schema";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  rate: number;
  fetchedAt: string;
  triggeredAlerts: {
    id: number;
    targetRate: number;
    direction: string;
  }[];
};

export const getCurrentRate = async (
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/rates/current`, {
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