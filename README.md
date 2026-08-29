# UPS Reconciliation

Matches WMS / TMS orders to the UPS invoice, reprices each order at its
customer's rate level, and reports margin per customer and variance per charge.

It answers two questions a month:

- **What did we make?** What the customer was billed, less what UPS charged.
- **What did UPS charge that the agreement does not support?** Every charge on
  the matched shipments, recomputed at the customer's own rate level and set
  against the invoice, largest gap first.

## How a period runs

1. **Import the UPS invoice** — Import Files.
2. **Download the template** — Mapping → Reconciliation. It arrives with the
   customer list already in it and one sheet to fill.
3. **Fill it from the WMS / TMS export** — one order per row; for a multi-package
   order every tracking number goes in the one cell, comma separated; the amount
   is the order total. The filling standard is a separate document.
4. **Import the filled template** — same screen. Anything it cannot accept is
   listed by line and nothing is imported until it is fixed.
5. **Read the two tables** — by customer, and by charge. Click a customer to
   scope the charge table to them. Export writes all three sheets.

## Signing in

`auth-config.js` sets `authMode: "local"`. One account is defined in
`index.html` under `LOCAL_ACCOUNTS`, as `sha256("username:password")` with the
username lower-cased — the password itself is never in the repository.

To change it, recompute the hash and replace that one line:

```
printf '%s' 'username:new-password' | sha256sum
```

**Know what this gate is and is not.** The check runs in the browser, and this
repository is public, so the hash can be read and attacked offline, and anyone
willing to open developer tools can step past the form. What it genuinely stops
is someone sitting down at a machine where the tool is already open — which
matters, because the imported invoices live in that browser and nowhere else.
It is a lock on the office door, not a safe. Put the site behind something that
controls who reaches the URL if the data warrants more, or set `authMode` to
`"supabase"` for real accounts, checked on the server.

The other two modes stay available: `"supabase"` for accounts shared with the
repricing tool (see `SUPABASE_SETUP.md`), and `"open"` for no gate at all.

## Setup

Rates, surcharges, size rules, channels and demand surcharges are configured
here the same way as in the repricing tool, because reconciliation reprices:
load a rate configuration file, or set them up on the tabs.

## Relationship to the repricing tool

This project carries its own copy of the pricing engine. That is deliberate, so
the two tools deploy and change independently — but it means **a change to a
rate rule, a surcharge or the invoice parser has to be made in both.** A fix
applied to only one will make the two disagree about the same shipment.

Browser storage is separate (`ups_recon_*`), so the two never overwrite each
other's saved configuration or invoice history on the same machine. The theme,
zoom and brand keys are shared on purpose: the two should look like one product.

## Publishing on GitHub Pages

The site is the repository root — no build step. Turn it on once, in
**Settings → Pages → Build and deployment → Source: Deploy from a branch**,
branch `main`, folder `/ (root)`. It lands on
`https://sandyliu3056.github.io/UPS-reconciliation/`.

Two things follow from that choice, both worth knowing before a deploy
confuses somebody:

**The repository has to stay public.** GitHub Pages will not publish a private
repository on the free plan. So the source, and the sign-in hash with it, are
readable by anyone — see *Signing in* above for what that gate is actually
worth.

**`_headers` does nothing here.** It asks Netlify and Cloudflare Pages to
revalidate `index.html` on every visit; GitHub Pages has no equivalent and
serves HTML with roughly ten minutes of browser cache. After pushing, a
browser that already has the page can keep running the old build for that
long — which looks exactly like a change that did not deploy, or a button that
stopped working. Hover the byline in the header to see the build time this tab
is running, and force-reload with Ctrl+Shift+R if it is behind. The file is
kept for the day this moves to a host that reads it.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole application |
| `auth-config.js` | Supabase URL and anon key; not secret, but per-deployment |
| `supabase/functions/` | Edge functions: account admin, address classification |
| `schema.sql`, `local_settings.sql`, `login_history.sql` | Database setup |
| `_headers`, `vercel.json` | Cache and host rules for Netlify / Cloudflare / Vercel; inert on GitHub Pages |

UPS API credentials belong in `supabase secrets set` and never in a browser form.
