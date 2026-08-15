import { z } from "zod";
import superjson from "superjson";
import { AlertDirectionArrayValues } from "../../helpers/schema";

export const schema = z.object({
  targetRate: z.number().positive(),
  direction: z.enum(AlertDirectionArrayValues),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  alert: {
    id: number;
    targetRate: number;
    direction: string;
    isActive: boolean;
    createdAt: string;
  };
};

export const postCreateAlert = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/alerts/create`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
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