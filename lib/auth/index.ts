import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/db/schema";

/**
 * Instancia o better-auth com adapter Drizzle/D1.
 * Sessões são armazenadas em D1 (tabela `session`).
 * Para hot-cache, better-auth usa cookies signed — KV não é necessário no MVP.
 */
export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    appName: "Lab Fluxos",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 dias
      updateAge: 60 * 60 * 24, // refresh a cada 1 dia
    },
    advanced: {
      cookiePrefix: "labfluxos",
    },
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
