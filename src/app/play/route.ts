import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadDecryptedCreds } from "@/server/lib/load-creds";
import { renderPlayer } from "@/server/lib/player-template";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const creds = await loadDecryptedCreds(userId);
  if (!creds) {
    return NextResponse.redirect(new URL("/settings", req.url));
  }

  const url = new URL(req.url);
  const embed = url.searchParams.get("embed") === "1";
  const preselectChannel = url.searchParams.get("channel_id") ?? undefined;
  const preselectTeam = url.searchParams.get("team") ?? undefined;
  const preselectLeague = url.searchParams.get("league") ?? undefined;

  const html = await renderPlayer({
    creds,
    embed,
    preselect:
      preselectChannel || preselectTeam || preselectLeague
        ? { channelId: preselectChannel, team: preselectTeam, league: preselectLeague }
        : undefined,
  });

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-frame-options": "SAMEORIGIN",
      "content-security-policy":
        "frame-ancestors 'self' https://*.thorsteinson.com;",
    },
  });
}
