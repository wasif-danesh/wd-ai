# ADR-0029: Billing and payments (Stripe, prepaid credits)

- **Status:** Proposed
- **Date:** 2026-10-08

## Context

Free allowances (today `songs_per_user_per_day: 10`) will not cover hosted-provider costs
(ADR-0025). Billing has to be designed before launch because it touches identity, quotas, usage
events and the runtime path of every paid action. The seams already exist: every billable action
writes a usage event (rule 9), all work carries `tenant_id` and `product_id` (rule 7), and quota is
checked before GPU work. Payment methods wanted: cards, PayPal and Google Pay.

## Decision (proposed)

- **Provider: Stripe** (Checkout, hosted by Stripe), which offers cards, Google Pay, Apple Pay and
  PayPal (check PayPal availability and fees for the launch country). Stripe is a processor, so we are
  the seller and handle tax: start with **Stripe Tax** to calculate and collect; revisit a merchant
  of record if tax work grows. Open source first (rule 12) is satisfied by an adapter: the product
  and ledger only see "credits purchased", so the provider can change.
- **Model: prepaid credits, not subscriptions at first.** A user buys a credit pack; each paid
  action spends credits. A free daily allowance stays, sized by measured cost (below). Subscriptions
  (monthly credits) can be added later on the same ledger.
- **Credits ledger** (append-only, never edited): `credit_ledger(id, tenant_id, product_id,
  user_id, kind, amount, balance_after, ref_type, ref_id, idempotency_key, created_at)`.
  Kinds: `grant_free`, `purchase`, `reserve`, `spend`, `release`, `refund`, `adjust` (admin, audited).
  The balance is the sum of the ledger; a cached balance row is updated in the same transaction.
- **Spend flow, no surprises:**
  1. `check_request` computes the price from the product's price table and **reserves** credits
     (free allowance first, then purchased) before any GPU work; not enough credit ends the run with
     a typed `insufficient_credits` event the UI turns into "buy credits".
  2. Each completed paid step **spends** its part (lyrics are cheap or free; music and cover are
     the paid jobs); a failed or refused run **releases** its reserve in full.
  3. Reserve, spend and release are idempotent per run and step, so retries and reconnects never
     double-charge.
- **Price table** lives in `product.yaml` (credits per song, per cover regeneration, and so on),
  not in code. Credit-to-money is set by the credit packs in Stripe.
- **Cost-based pricing.** Add `cost_usd` (or provider credits) to every LLM and job usage event
  (ADR-0025 binding metadata supplies unit prices). After a few hundred real songs, set the price
  from measured cost plus a margin, and size the free allowance as an acquisition cost with a
  global daily spend breaker.
- **Stripe integration:**
  - API creates a Checkout Session (mode `payment`) for a pack, with `client_reference_id` = our
    user and the pack id in metadata; the browser is redirected to Stripe. No card data touches
    our servers (keeps PCI scope minimal).
  - A **webhook** (`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
    `charge.refunded`, `charge.dispute.created`) grants or claws back credits. It verifies the
    Stripe signature, stores each event id (unique) so replays are no-ops, and is the only thing
    that grants purchased credits (never the redirect back).
  - Refunds and disputes create negative ledger entries; a user whose balance goes negative cannot
    start paid runs until topped up. Abuse of disputes can suspend the account.
  - Stripe customer id is stored per user; invoices and receipts come from Stripe.
- **Keys and config:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` come from the secrets
  manager (rule 13), never from the admin UI database; test mode keys in dev and staging, live only
  in production. Packs and prices are Stripe Price IDs referenced by the product config.
- **API surface (a public API addition, so reviewed before building):** `GET /billing/balance`,
  `GET /billing/ledger`, `POST /billing/checkout`, `POST /billing/webhook/stripe` (unauthenticated
  by identity, authenticated by signature), plus admin adjust. Typed errors `insufficient_credits`.
- **UI:** balance in the header, a buy-credits page, history, and a clear price shown before
  "Approve & make the music". Admin: ledger search and manual adjustments (audited).
- **Legal and tax before going live:** terms, refund policy (generated content is consumed on
  delivery; state when refunds apply), privacy policy, Stripe Tax registration for the
  launch regions, and business details on Stripe. Anyone under age limits is excluded in the terms.

## Alternatives considered

- **Merchant of record (Paddle, Lemon Squeezy):** handles global tax for about 5% + $0.50 per
  transaction; rejected for now on cost, revisit if tax and compliance work outgrows the savings.
- **Subscriptions only:** simpler revenue, but unused allowances and a poor fit for bursty
  generation costs; credits first, subscriptions as a later layer.
- **Pay per song at checkout:** too much friction and tiny payments carry fixed fees.

## Consequences

- **Order of work:** authentication (identity) first; then `cost_usd` on usage events; then the ledger
  and reserve/spend/release in the song graph; then Stripe Checkout and webhook; then the UI.
- Small purchases carry Stripe's fixed fee, so the smallest pack must be large enough to keep the
  fee reasonable.
- The ledger and webhook are the highest-risk code in the system; they need property-style tests
  (no double grant or spend, ledger always sums to balance) and a Stripe test-mode end-to-end run.
- Free allowance plus signup makes abuse likely: it needs authentication, email verification, rate
  limits and the spend breaker before launch.
