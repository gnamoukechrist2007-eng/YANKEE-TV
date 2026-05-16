import type { DecryptedCreds } from "./load-creds";

export type LiveStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id?: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
};

export async function getLiveStreams(creds: DecryptedCreds): Promise<LiveStream[]> {
  const url = `${creds.serverUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=get_live_streams`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`xtream get_live_streams failed: ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data as LiveStream[];
}

const STOPWORDS = new Set(["fc", "afc", "the", "of", "and"]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function rankChannelsForTeam(
  team: string,
  league: string | undefined,
  streams: LiveStream[],
): { stream: LiveStream; score: number }[] {
  const teamTokens = tokenize(team);
  if (teamTokens.length === 0) return [];
  const leagueLc = league?.toLowerCase();

  const ranked = streams
    .map((s) => {
      const nameLc = s.name.toLowerCase();
      const nameTokens = tokenize(s.name);
      let score = 0;
      for (const t of teamTokens) {
        if (nameTokens.includes(t)) score += 10;
        else if (nameLc.includes(t)) score += 3;
      }
      if (leagueLc && nameLc.includes(leagueLc)) score += 5;
      if (/\bhd\b/.test(nameLc)) score += 1;
      if (/\b4k\b/.test(nameLc)) score += 2;
      return { stream: s, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked;
}
