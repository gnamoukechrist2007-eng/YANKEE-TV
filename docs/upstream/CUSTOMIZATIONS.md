# Upstream Customizations

Source: https://github.com/xsukax/xsukax-IPTV-Player (`index.html`, GPL-3.0)

Pristine copy: `docs/upstream/xsukax-index.html`
Working copy: `src/lib/player/player.html`

## Diff summary

1. **`<title>`** changed to `TV — thorsteinson.com`.
2. **`hls.js` script tag**: pinned from `hls.js@latest` to `hls.js@1.5.17/dist/hls.min.js` with SRI `sha384-9v3HcdYrO3D+OPDTjZ40RXocgE4GtXVCd3/mCS62JsM93JXgI1afJVuwjFvsu6ni` and `crossorigin="anonymous"`. Eliminates supply-chain risk from `@latest`.
3. **`init()`**: after upstream calls, auto-login via `window.__IPTV__` if server injected creds. Skips the upstream login modal entirely.
4. **`autoLoginFromServer(creds)`** added — calls `player_api.php` with provided creds, populates `state.userInfo`, calls `loadApp()`.
5. **`playStream()`** wrapped to async: acquires `/api/stream-lock` `start` action before HLS load; starts heartbeat. On 409 conflict, prompts user to take over; on 404 during heartbeat, stops playback.
6. **`acquireStreamLock()`, `startHeartbeat()`, `stopHeartbeat()`** added (under `getCatName`).
7. **`beforeunload` + `visibilitychange`** handlers added to release the stream lock when user leaves.

## Pulling upstream updates

1. `git fetch upstream`
2. Diff: `git diff upstream/main -- index.html` (upstream path)
3. Re-apply the patches above to `src/lib/player/player.html` manually, or use a 3-way merge tool.
4. Recompute SRI if `hls.js` version is bumped: `curl -s https://cdn.jsdelivr.net/npm/hls.js@<ver>/dist/hls.min.js | openssl dgst -sha384 -binary | openssl base64 -A`.
