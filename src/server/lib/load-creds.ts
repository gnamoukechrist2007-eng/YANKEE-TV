import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { iptvCredentials } from "@/server/db/schema";
import { decrypt } from "@/server/lib/crypto";

export type DecryptedCreds = {
  serverUrl: string;
  username: string;
  password: string;
};

export async function loadDecryptedCreds(userId: string): Promise<DecryptedCreds | null> {
  const rows = await db
    .select()
    .from(iptvCredentials)
    .where(eq(iptvCredentials.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const password = decrypt(row.passwordEncrypted, row.iv, row.tag);
  return {
    serverUrl: row.serverUrl,
    username: row.username,
    password,
  };
}
