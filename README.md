# tv-thorsteinson

Modular web-based IPTV player for `tv.thorsteinson.com`. Wraps [xsukax/xsukax-IPTV-Player](https://github.com/xsukax/xsukax-IPTV-Player) (GPL-3.0) in a Next.js 16 app with:

- Google OAuth (Auth.js v5) with per-app email allowlist
- Encrypted Xtream Codes credential storage (AES-256-GCM at rest)
- Server-side single-stream lock (prevents IPTV provider concurrent-stream bans)
- Pluggable integration via stable URL contract — link to `/watch?team=X&league=Y` from any thorsteinson.com app
- Shared SSO cookie on `.thorsteinson.com` parent domain

Stream playback is browser-direct to the IPTV provider — never proxied through this server or Cloudflare.

## Architecture

```
Browser ──HTTPS──→ CF Tunnel ──→ Mac mini Docker
                                  ├─ iptv-web (Next.js 16)
                                  └─ iptv-postgres

Stream chunks (browser direct, bypasses CF + iptv-web entirely):
Browser ──HTTPS──→ Xtream provider (player_api.php, .m3u8, .ts)
```

## Routes

| Route | Purpose |
|------|--------|
| `/` | Player UI (iframes `/play`) |
| `/play` | Raw HTML player (forked xsukax + creds injected) |
| `/watch?team=&league=` | Resolve team → channel, redirect to player with preselect |
| `/watch?channel_id=` | Direct channel ID playback |
| `/login` | Google OAuth sign-in |
| `/settings` | Manage Xtream Codes credentials |
| `/api/auth/*` | Auth.js handlers |
| `/api/creds` | GET/PUT encrypted credentials |
| `/api/stream-lock` | `start` / `heartbeat` / `stop` |
| `/api/sso/status` | Cross-app session check (CORS-enabled for `*.thorsteinson.com`) |
| `/api/health` | DB connectivity check |

## Environment

See `.env.example`. Required:

| Var | Purpose |
|-----|--------|
| `DATABASE_URL` | Postgres connection (matches `iptv-postgres` service) |
| `AUTH_SECRET` | Shared with `mlb-tracker` for cross-app SSO |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Shared OAuth client; redirect URI `https://tv.thorsteinson.com/api/auth/callback/google` |
| `AUTH_URL` | `https://tv.thorsteinson.com` |
| `AUTH_TRUST_HOST` | `true` (behind CF tunnel) |
| `TV_ALLOWED_EMAILS` | Comma-separated allowlist for this app |
| `IPTV_ENC_KEY` | 32 bytes hex (`openssl rand -hex 32`) — encrypts Xtream passwords |
| `IPTV_PG_PASSWORD` | Postgres password for the `iptv-postgres` container |

## Deploy (Mac mini)

```bash
rsync -av --exclude=node_modules --exclude=.next --exclude=.git \
  ./ paul@192.168.0.3:~/mlb-compute/iptv/
ssh paul@192.168.0.3 'cd ~/mlb-compute/iptv && \
  docker compose -f docker-compose.prod.yml --env-file .env up -d --build'
```

Then add `tv.thorsteinson.com` public hostname → `http://iptv-web:3000` in the existing Cloudflare Tunnel, and add the redirect URI to the Google OAuth client.

## Upstream attribution

xsukax IPTV Player by xsukax — GPL-3.0. The pristine upstream HTML is preserved at `docs/upstream/xsukax-index.html`. Customizations documented in `docs/upstream/CUSTOMIZATIONS.md`.
