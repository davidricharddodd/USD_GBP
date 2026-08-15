import { schema, OutputType } from "./history_GET.schema";
import superjson from "superjson";
import { db } from "../../helpers/db";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const result = schema.parse(query);

    const pastDate = new Date(Date.now() - result.days * 24 * 60 * 60 * 1000);

    // Use DISTINCT ON to get only the latest rate per calendar day.
    // ORDER BY DATE(fetched_at) ASC, fetched_at DESC ensures DISTINCT ON keeps
    // the most recent row for each day, then returns days in ascending order.
        const history = await sql<{ rate: string; fetchedAt: string }>`
      SELECT DISTINCT ON (DATE(fetched_at))
        rate,
        fetched_at
      FROM exchange_rates
      WHERE fetched_at >= ${pastDate}
      ORDER BY DATE(fetched_at) ASC, fetched_at DESC
    `.execute(db);

    console.log(
      `[rates/history] Fetched ${history.rows.length} daily rates for last ${result.days} day(s)`
    );

    const rates = history.rows.map((h) => ({
      rate: parseFloat(h.rate),
      fetchedAt: new Date(h.fetchedAt).toISOString(),
    }));

    return new Response(superjson.stringify({ rates } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[rates/history] Error:", message);
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}