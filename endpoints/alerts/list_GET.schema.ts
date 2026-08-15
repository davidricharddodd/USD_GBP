import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  alerts: {
    id: number;
    targetRate: number;
    direction: string;
    isActive: boolean;
    triggeredAt: string | null;
    createdAt: string;
  }[];
};

export const getAlertsList = async (
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/alerts/list`, {
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