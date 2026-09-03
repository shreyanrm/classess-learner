# DNS — heywobo.com

The single source of truth for every record on the domain. `DEPLOY.md` repeats this table;
if the two ever disagree, **this file wins** and DEPLOY.md gets fixed.

Bought 2026-09-03. Records are entered at the registrar's DNS (or wherever the zone is
hosted). Nothing here is a secret — DNS is public by construction — but three of the values
are **read off a dashboard, never copied from memory**, and they are marked as such.

## The table

| Record | Type | Host / name | Value | Where the value comes from |
|---|---|---|---|---|
| Apex → web | `ALIAS` / `ANAME` (or `A`) | `@` (`heywobo.com`) | `cname.vercel-dns.com` where the provider supports flattening; otherwise the **A record Vercel prints** for this project | **Read it off Vercel → Project → Domains.** Vercel has changed its apex IP; a remembered address silently serves someone else's project |
| www → web | `CNAME` | `www` | `cname.vercel-dns.com` | Vercel, fixed. `www` is added in Vercel as a **redirect to the apex**, so the canonical origin stays `https://heywobo.com` |
| api → gateway | `CNAME` | `api` | the **Railway-provided target** for the custom domain (Railway → service → Settings → Domains → Custom Domain) | **Read it off Railway.** It is per-service; the old `*.up.railway.app` address is not the answer |
| DKIM 1 | `CNAME` | `<token1>._domainkey` | `<token1>.dkim.amazonses.com` | **Read the three tokens off SES → Verified identities → heywobo.com.** All three must exist or signing fails |
| DKIM 2 | `CNAME` | `<token2>._domainkey` | `<token2>.dkim.amazonses.com` | same |
| DKIM 3 | `CNAME` | `<token3>._domainkey` | `<token3>.dkim.amazonses.com` | same |
| SPF | `TXT` | `@` | `v=spf1 include:amazonses.com ~all` | One SPF record per domain — **merge** into the existing one rather than adding a second, which is a permerror |
| DMARC | `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@heywobo.com; adkim=s; aspf=s` | Start at `p=none` and read the reports for two weeks before tightening to `quarantine`, then `reject` |
| Custom MAIL FROM (optional) | `MX` | `mail` | `10 feedback-smtp.<region>.amazonses.com` | Only if a custom MAIL FROM subdomain is configured in SES; the region is the SES region |
| Custom MAIL FROM (optional) | `TXT` | `mail` | `v=spf1 include:amazonses.com ~all` | pairs with the MX row above |

### Mail provider — read this before entering the DKIM rows

The gateway's live sender is **Resend** today (`RESEND_API_KEY`, `services/gateway/src/wobo_gateway/email.py`).
The DKIM/SPF rows above are the **SES** shape. Enter the rows for the provider that will
actually send: Resend prints its own DKIM `CNAME` and return-path records in
Domains → heywobo.com, and its SPF include is `amazonses.com` too (Resend sends over SES), so
the SPF and DMARC rows are unchanged either way. Only the three `_domainkey` hosts differ.
`EMAIL_MODE` stays `console` until the domain shows verified in the provider's dashboard.

### Addresses

| Address | Used for | Set by |
|---|---|---|
| `hello@heywobo.com` | the `From` on transactional mail | `EMAIL_FROM` (default `Wobo <hello@heywobo.com>`) |
| `no-reply@heywobo.com` | reserved for automated mail no human should answer | not yet wired; set `EMAIL_FROM` to it if that changes |
| `support@heywobo.com` | the `Reply-To` on every send, and where a learner's reply lands | `EMAIL_REPLY_TO` (default `support@heywobo.com`) |

All three need a **receiving** route (a forwarder or a mailbox) before `EMAIL_MODE=live`:
a `Reply-To` that bounces is worse than none.

### Supabase — deliberately no record

There is **no** `db.heywobo.com`. The browser reaches the database through our own origin:
`vercel.json` rewrites `/db/:path*` to the project URL, and the web app is built with
`VITE_SUPABASE_PROXY=1` so every auth and PostgREST call goes to `https://heywobo.com/db/…`.
That is why the CSP no longer allows `*.supabase.co` at all.

Consequences, so nobody is surprised:

- **No WebSocket through the proxy.** Vercel rewrites do not proxy `wss://`. The app uses
  plain `fetch` for auth and PostgREST and no Supabase realtime, so nothing depends on it —
  but adding realtime means either a `wss://*.supabase.co` CSP entry and a direct connection,
  or Supabase's own custom-domain add-on.
- Supabase's **redirect allowlist** (Authentication → URL Configuration) must contain
  `https://heywobo.com/**`, since that is the origin the OAuth round-trip returns to.
- Turning the proxy off is a two-line change: `VITE_SUPABASE_PROXY=0` and the
  `https://*.supabase.co` entry back into `connect-src`.

## Verifying

```sh
dig +short heywobo.com
dig +short www.heywobo.com
dig +short api.heywobo.com
dig +short TXT heywobo.com          # exactly one v=spf1 record
dig +short TXT _dmarc.heywobo.com
dig +short CNAME <token1>._domainkey.heywobo.com

curl -sI https://heywobo.com | grep -iE 'content-security|strict-transport'
curl -s  https://api.heywobo.com/healthz
curl -sI https://heywobo.com/db/auth/v1/health   # the rewrite reaches the project
```
