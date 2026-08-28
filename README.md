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

There is no password. `auth-config.js` sets `authMode: "open"`, so the site
opens straight into the app, everything is stored under one identity on the
machine it is used from, and the cloud is left alone — settings and invoice
history live in that browser only.

That is a deliberate choice for an internal tool, not an oversight. Anyone who
can reach the URL can use it and can read whatever has been imported into it,
so it belongs behind something that controls who reaches the URL. To turn
accounts on, set `authMode` to `"supabase"`: the sign-in gate, the Admin tab
and the account sync come back, and the data saved while it was open is picked
up again by the identity-claim prompt on first sign-in.

## Setup

Rates, surcharges, size rules, channels and demand surcharges are configured
here the same way as in the repricing tool, because reconciliation reprices:
load a rate configuration file, or set them up on the tabs.

With `authMode: "supabase"` the accounts are shared with the repricing tool —
same project, same passwords. See `SUPABASE_SETUP.md`.

## Relationship to the repricing tool

This project carries its own copy of the pricing engine. That is deliberate, so
the two tools deploy and change independently — but it means **a change to a
rate rule, a surcharge or the invoice parser has to be made in both.** A fix
applied to only one will make the two disagree about the same shipment.

Browser storage is separate (`ups_recon_*`), so the two never overwrite each
other's saved configuration or invoice history on the same machine. The theme,
zoom and brand keys are shared on purpose: the two should look like one product.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole application |
| `auth-config.js` | Supabase URL and anon key; not secret, but per-deployment |
| `supabase/functions/` | Edge functions: account admin, address classification |
| `schema.sql`, `local_settings.sql`, `login_history.sql` | Database setup |
| `_headers`, `vercel.json` | Static-host configuration |

UPS API credentials belong in `supabase secrets set` and never in a browser form.
