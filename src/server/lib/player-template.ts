import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: string | null = null;

async function loadTemplate(): Promise<string> {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "src", "lib", "player", "player.html");
  cached = await readFile(filePath, "utf8");
  return cached;
}

export async function renderPlayer(opts: {
  creds: { serverUrl: string; username: string; password: string } | null;
  embed?: boolean;
  preselect?: { channelId?: string; team?: string; league?: string };
}): Promise<string> {
  const html = await loadTemplate();
  const payload = {
    server_url: opts.creds?.serverUrl ?? null,
    username: opts.creds?.username ?? null,
    password: opts.creds?.password ?? null,
    embed: !!opts.embed,
    preselect: opts.preselect ?? null,
  };
  const inject = `<script>window.__IPTV__ = ${JSON.stringify(payload).replace(/</g, "\\u003c")};</script>`;
  return html.replace("</head>", `${inject}\n</head>`);
}
