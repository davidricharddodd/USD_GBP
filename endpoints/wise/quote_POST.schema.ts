import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  sourceAmount: z.number().positive(),
});

export type InputType = z.infer<typeof schema>;

export type PaymentOption = {
  payIn: string;
  fee: {
    total: number;
    transferwise: number;
    payIn: number;
    discount: number;
  };
  sourceAmount: number;
  targetAmount: number;
  estimatedDelivery: string | null;
};

export type OutputType = {
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  paymentOptions: PaymentOption[];
};

export const postWiseQuote = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/wise/quote`, {
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