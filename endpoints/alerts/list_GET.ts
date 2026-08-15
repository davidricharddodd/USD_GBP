import { OutputType } from "./list_GET.schema";
import superjson from "superjson";
import { db } from "../../helpers/db";

export async function handle(request: Request) {
  try {
    const alertsRecords = await db
      .selectFrom("rateAlerts")
      .selectAll()
      .orderBy("createdAt", "desc")
      .execute();

    const alerts = alertsRecords.map((a) => ({
      id: a.id,
      targetRate: parseFloat(a.targetRate as string),
      direction: a.direction,
      isActive: a.isActive,
      triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }));

    return new Response(superjson.stringify({ alerts } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), {
      status: 400,
    });
  }
}