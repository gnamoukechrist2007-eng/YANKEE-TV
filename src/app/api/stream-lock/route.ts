import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { activeStreams } from "@/server/db/schema";

const STALE_THRESHOLD_SECONDS = 60;

const schema = z.object({
  action: z.enum(["start", "heartbeat", "stop"]),
  stream_id: z.string().min(1).max(1024),
  force: z.boolean().optional(),
});

async function userId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { action, stream_id: streamId, force } = parsed.data;

  if (action === "start") {
    const existing = await db
      .select()
      .from(activeStreams)
      .where(eq(activeStreams.userId, uid))
      .limit(1);
    const cur = existing[0];

    if (cur) {
      const fresh =
        Date.now() - new Date(cur.lastHeartbeat).getTime() < STALE_THRESHOLD_SECONDS * 1000;
      const sameStream = cur.streamId === streamId;
      if (sameStream) {
        await db
          .update(activeStreams)
          .set({ lastHeartbeat: new Date() })
          .where(eq(activeStreams.userId, uid));
        return NextResponse.json({ ok: true, took_over: false });
      }
      if (fresh && !force) {
        return NextResponse.json(
          { error: "conflict", conflict_stream_id: cur.streamId },
          { status: 409 },
        );
      }
      await db
        .update(activeStreams)
        .set({ streamId, startedAt: new Date(), lastHeartbeat: new Date() })
        .where(eq(activeStreams.userId, uid));
      return NextResponse.json({ ok: true, took_over: true });
    }

    await db.insert(activeStreams).values({ userId: uid, streamId });
    return NextResponse.json({ ok: true, took_over: false });
  }

  if (action === "heartbeat") {
    const updated = await db
      .update(activeStreams)
      .set({ lastHeartbeat: new Date() })
      .where(and(eq(activeStreams.userId, uid), eq(activeStreams.streamId, streamId)))
      .returning({ id: activeStreams.userId });
    if (updated.length === 0) {
      return NextResponse.json({ error: "no_active_lock" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // stop
  await db
    .delete(activeStreams)
    .where(and(eq(activeStreams.userId, uid), eq(activeStreams.streamId, streamId)));
  return NextResponse.json({ ok: true });
}
