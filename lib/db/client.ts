import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Cliente Drizzle do D1. Use em Route Handlers e Server Actions.
 *
 *   const db = await getDb();
 *   const demands = await db.select().from(schema.demand);
 */
export async function getDb(): Promise<DB> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

export { schema };
