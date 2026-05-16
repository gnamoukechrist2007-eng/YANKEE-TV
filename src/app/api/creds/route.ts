import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { iptvCredentials } from "@/server/db/schema";
import { encrypt } from "@/server/lib/crypto";

async function userId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db.select().from(iptvCredentials).where(eq(iptvCredentials.userId, uid)).limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ server_url: null, username: null, has_password: false });
  }
  return NextResponse.json({
    server_url: row.serverUrl,
    username: row.username,
    has_password: true,
  });
}

const putSchema = z.object({
  server_url: z.string().url().max(2048),
  username: z.string().min(1).max(256),
  password: z.string().min(1).max(1024),
});

export async function PUT(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const serverUrl = parsed.data.server_url.replace(/\/+$/, "");
  const { ciphertext, iv, tag } = encrypt(parsed.data.password);

  await db
    .insert(iptvCredentials)
    .values({
      userId: uid,
      serverUrl,
      username: parsed.data.username,
      passwordEncrypted: ciphertext,
      iv,
      tag,
    })
    .onConflictDoUpdate({
      target: iptvCredentials.userId,
      set: {
        serverUrl,
        username: parsed.data.username,
        passwordEncrypted: ciphertext,
        iv,
        tag,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
