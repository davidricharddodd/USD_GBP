import { schema, OutputType } from "./create_POST.schema";
import superjson from "superjson";
import { db } from "../../helpers/db";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const result = schema.parse(json);

    const inserted = await db
      .insertInto("rateAlerts")
      .values({
        targetRate: result.targetRate,
        direction: result.direction,
        isActive: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const alert = {
      id: inserted.id,
      targetRate: parseFloat(inserted.targetRate as string),
      direction: inserted.direction,
      isActive: inserted.isActive,
      createdAt: inserted.createdAt.toISOString(),
    };

    return new Response(superjson.stringify({ alert } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), {
      status: 400,
    });
  }
}