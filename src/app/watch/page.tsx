import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { teamChannelMap } from "@/server/db/schema";
import { loadDecryptedCreds } from "@/server/lib/load-creds";
import { getLiveStreams, rankChannelsForTeam } from "@/server/lib/xtream";

export const dynamic = "force-dynamic";

type SearchParams = {
  team?: string;
  league?: string;
  channel_id?: string;
  epg_id?: string;
  embed?: string;
};

async function resolveChannel(
  userId: string,
  team: string,
  league: string | undefined,
): Promise<{ channelId: string | null; candidates: { id: string; name: string }[] }> {
  const teamKey = team.toLowerCase().trim();
  const leagueKey = (league ?? "").toLowerCase().trim();
  const cached = await db
    .select()
    .from(teamChannelMap)
    .where(
      and(
        eq(teamChannelMap.userId, userId),
        eq(teamChannelMap.teamKey, teamKey),
        eq(teamChannelMap.league, leagueKey),
      ),
    )
    .limit(1);
  if (cached[0]) return { channelId: cached[0].channelId, candidates: [] };

  const creds = await loadDecryptedCreds(userId);
  if (!creds) return { channelId: null, candidates: [] };
  const streams = await getLiveStreams(creds);
  const ranked = rankChannelsForTeam(team, league, streams);
  if (ranked.length === 0) return { channelId: null, candidates: [] };

  if (ranked.length === 1 || ranked[0].score >= ranked[1].score * 2) {
    const choice = ranked[0].stream;
    await db
      .insert(teamChannelMap)
      .values({
        userId,
        teamKey,
        league: leagueKey,
        channelId: String(choice.stream_id),
      })
      .onConflictDoNothing();
    return { channelId: String(choice.stream_id), candidates: [] };
  }

  return {
    channelId: null,
    candidates: ranked.slice(0, 8).map((r) => ({
      id: String(r.stream.stream_id),
      name: r.stream.name,
    })),
  };
}

async function pickChannel(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("unauthorized");
  const team = String(formData.get("team") ?? "").trim();
  const league = String(formData.get("league") ?? "").trim();
  const channelId = String(formData.get("channel_id") ?? "").trim();
  if (!team || !channelId) return;
  await db
    .insert(teamChannelMap)
    .values({ userId, teamKey: team.toLowerCase(), league: league.toLowerCase(), channelId })
    .onConflictDoUpdate({
      target: [teamChannelMap.userId, teamChannelMap.teamKey, teamChannelMap.league],
      set: { channelId, confirmedAt: new Date() },
    });
  const next = new URLSearchParams({ team, league, channel_id: channelId });
  redirect(`/watch?${next.toString()}`);
}

export default async function Watch({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const creds = await loadDecryptedCreds(userId);
  if (!creds) redirect("/settings");

  let channelId = sp.channel_id ?? null;
  let candidates: { id: string; name: string }[] = [];

  if (!channelId && sp.team) {
    const resolved = await resolveChannel(userId, sp.team, sp.league);
    channelId = resolved.channelId;
    candidates = resolved.candidates;
  }

  if (candidates.length > 0) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-md mx-auto space-y-6">
          <header>
            <h1 className="text-xl font-semibold">Pick channel for {sp.team}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              We&apos;ll remember this for next time.
            </p>
          </header>
          <form action={pickChannel} className="space-y-3">
            <input type="hidden" name="team" value={sp.team ?? ""} />
            <input type="hidden" name="league" value={sp.league ?? ""} />
            {candidates.map((c) => (
              <button
                key={c.id}
                type="submit"
                name="channel_id"
                value={c.id}
                className="w-full text-left rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm hover:border-neutral-600 transition"
              >
                {c.name}
              </button>
            ))}
          </form>
        </div>
      </main>
    );
  }

  if (!channelId) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-md mx-auto text-center space-y-3">
          <h1 className="text-xl font-semibold">No matching channel</h1>
          <p className="text-sm text-neutral-400">
            Couldn&apos;t find a channel for {sp.team ?? "the requested input"}.
          </p>
          <a href="/" className="inline-block underline text-sm text-neutral-300">
            Browse all channels
          </a>
        </div>
      </main>
    );
  }

  const params = new URLSearchParams();
  params.set("channel_id", channelId);
  if (sp.embed === "1") params.set("embed", "1");

  return (
    <iframe
      title="player"
      src={`/play?${params.toString()}`}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      allow="autoplay; fullscreen; encrypted-media"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: 0,
      }}
    />
  );
}
