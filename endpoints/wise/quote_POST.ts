import { schema, OutputType, PaymentOption } from "./quote_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const result = schema.parse(json);

    const wiseRes = await fetch("https://api.wise.com/v3/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceCurrency: "USD",
        targetCurrency: "GBP",
        sourceAmount: result.sourceAmount,
      }),
    });

    if (!wiseRes.ok) {
      const errorText = await wiseRes.text();
      console.error("Wise API error:", errorText);
      throw new Error(`Wise API error: ${wiseRes.statusText}`);
    }

    const wiseData = await wiseRes.json();

    const output: OutputType = {
      rate: wiseData.rate,
      sourceAmount: wiseData.sourceAmount,
      targetAmount: wiseData.targetAmount || wiseData.paymentOptions?.[0]?.targetAmount || 0,
      paymentOptions: (wiseData.paymentOptions || []).map((opt: any) => ({
        payIn: opt.payIn,
        fee: {
          total: opt.fee?.total || 0,
          transferwise: opt.fee?.transferwise || 0,
          payIn: opt.fee?.payIn || 0,
          discount: opt.fee?.discount || 0,
        },
        sourceAmount: opt.sourceAmount,
        targetAmount: opt.targetAmount,
        estimatedDelivery: opt.estimatedDelivery,
      })),
    };

    return new Response(superjson.stringify(output satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), {
      status: 400,
    });
  }
}