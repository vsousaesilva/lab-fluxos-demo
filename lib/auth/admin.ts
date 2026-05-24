import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Lê a whitelist de emails admin da env var `ADMIN_EMAILS`
 * (separados por vírgula). Casefold pra evitar erro de capitalização.
 */
export async function listAdminEmails(): Promise<string[]> {
  const { env } = await getCloudflareContext({ async: true });
  const raw = env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const admins = await listAdminEmails();
  return admins.includes(email.toLowerCase());
}
