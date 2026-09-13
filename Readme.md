because we found and fixed a specific data problem in Meesho's real export
files.** Anyone re-implementing this (in Antigravity, a Docker service, or
anywhere else) should preserve the *reasoning*, not just the arithmetic —
the reasoning is what makes the numbers trustworthy.

---

## 1. Why this was built (don't skip this)

We first compared two commercial Meesho P&L tools (SellerBox.in and
meeshoprofit.in). Neither has independent reviews, audits, or public
methodology — they're black boxes you're trusting with real business
decisions.

We then built our own calculator and found, by testing it against actual
account data, that **meeshoprofit.in has a real, provable bug**: Meesho
sometimes splits one order's settlement across two rows in its export — an
initial leg, and a second "adjustment" leg (a small later deduction/credit)
that carries a *blank* status field. meeshoprofit.in appears to only sum
rows that have a status, silently dropping the blank-status adjustment rows.
In our August 2026 file this meant it overstated settlement by exactly
₹675.48 (30 dropped rows) and overstated order count (710 vs the true 707
distinct orders) by double-counting 4 orders that happen to have two
status-bearing rows each.

Separately, meeshoprofit.in's headline "Net Profit" didn't subtract Meesho
Ads spend at all — its own dashboard has no ads line item anywhere. Once we
added back our ads cost to our own profit figure, it landed within ₹100 of
their number — proving the *revenue-minus-cost* math was nearly identical
between the two tools, and the entire ~₹11,600 gap was simply ads spend
their tool never accounted for.

**Lesson for the rebuild:** don't trust a number just because a dashboard
shows it confidently. Every number in this project was arrived at by
inspecting the raw file, understanding *why* a column has the value it has,
and — where possible — checking it against an outside source of truth (see
§5, bank reconciliation).

---

## 2. Data sources

### 2.1 Payment File — `*_PAYMENT_FILE_*.xlsx` (the source of truth)

Downloaded from the Meesho Supplier Panel. Filename encodes a **payment
date** window (e.g. `2026-08-01_2026-08-31`), not an order date window —
confirmed by inspection: order dates inside the file routinely start weeks
before the window (delivery + settlement lag). This file is the only source
needed to compute real, realized P&L for a period.

Sheets:

| Sheet | Contents | Used for |
|---|---|---|
| `Order Payments` | One row per settlement leg per order. `Final Settlement Amount` is Meesho's own fully-netted per-order number (commission, shipping, GST, TCS/TDS, per-order compensation/claims/recovery already applied). | Revenue + COGS basis |
| `Ads Cost` | Campaign-level ad spend (by Campaign ID, **no SKU or order link**). `Total Ads Cost` column is already negative. | Account-level deduction only |
| `Referral Payments` | Referral program credits, if any (`Net Referral Amount` column). Empty most months. | Account-level addition |
| `Compensation and Recovery` | Account-level compensation/recovery not tied to a specific order (`Amount (inc GST) INR`). Empty most months. | Account-level adjustment |
| `Disclaimer` | Boilerplate text only. | Not used |

**Parsing gotchas (real, encountered, must be replicated):**

- Every sheet has a *second* header-like row directly under the real header
  — a formula-legend/description row (e.g. "Final Settlement Amount" row 0
  literally contains the text of the sum formula, not a number). **Skip
  this row** (`header=1` then drop the first resulting data row).
- Numeric columns (`Final Settlement Amount`, `Total Sale Amount...`,
  `Quantity`, etc.) are exported as **text/object dtype**, not numbers —
  the legend row above forces pandas to infer the whole column as string.
  Every numeric column needs explicit `pd.to_numeric(..., errors="coerce")`.
- **A single `Sub Order No` can appear on multiple rows.** We found orders
  with an initial "Shipped" settlement leg and a much-later "Return"
  reversal leg, sometimes plus a third blank-status adjustment leg. **You
  must group by `Sub Order No` and SUM `Final Settlement Amount` across all
  its rows** — that sum is the true net amount paid for that order. Do not
  deduplicate/drop rows.
- `Live Order Status` can genuinely differ across a Sub Order No's multiple
  rows (e.g. "Shipped" on the early leg, "Return" on the later reversal).
  Resolve **one final status per order** using a priority order where
  terminal outcomes win: `Cancelled/RTO/Return/Lost > Exchange > Delivered
  > Shipped > (no status recorded)`.
- Small number of orders (1-3 per period, so far) have **no non-blank
  status at all** across any of their rows — an orphan settlement leg whose
  primary leg presumably landed in a *different* month's payment file.
  These need a documented fallback (currently: no COGS charged, flagged for
  manual review) rather than silently guessing.
- SKU codes have real near-duplicates from manual catalog entry:
  `BQ_RS_01` / `BQ_RS_001` / `bq_rs_1`, `eyes_50` / `Safety_Eyes_50`, etc.
  **Do not fuzzy-merge these.** Match cost lookups on the exact string, and
  surface any SKU with no cost mapping as an explicit warning rather than
  defaulting it to zero silently.

### 2.2 Orders CSV — `Orders_*.csv` (optional, informational only)

Order-date-organized export (all rows placed within the window). Has **no
fee/settlement breakdown** — gross listing price only. **Not used in any
P&L calculation.** Its only use: cross-referencing against the Payment
File's `Sub Order No` set to report orders placed this window that
**haven't been paid yet** ("pending / not yet settled"). This is pipeline
visibility, not part of profit — confirmed by testing that omitting this
file entirely produces an identical P&L number.

### 2.3 SKU cost file — `sku_costs.json`

User-maintained. Currently `{ "SKU_CODE": unit_cost, ... }` — a flat
per-unit product cost. **55 SKUs**, all currently filled in from the seller's
own cost records (not estimated). See §6 for the planned v2 schema change
(splitting cost into making cost + packaging cost).

### 2.4 Bank statement (verification only, not a computation input)

Used once, manually, to independently verify the whole pipeline — see §5.
Not part of the regular monthly calculation; the Payment File alone is
sufficient for that.

---

## 3. Core methodology

**Realized P&L = built entirely from the Payment File.** Cash/settlement
basis: covers whichever orders *actually got paid* in the window, regardless
of which month they were originally placed in. This is deliberate — it's
the only way the number can ever be checked against a bank statement.

```
Net Settlement      = SUM(Final Settlement Amount) grouped by Sub Order No
COGS                = SUM(unit_cost[SKU] × quantity × cogs_fraction(status))
Gross Profit        = Net Settlement − COGS
Ads Cost            = SUM(Total Ads Cost)                [account-level, negative]
Referral Income     = SUM(Net Referral Amount)           [account-level]
Other Comp/Recovery = SUM(Amount (inc GST) INR)          [account-level]
─────────────────────────────────────────────────────────────────────────
NET PROFIT          = Gross Profit + Ads Cost + Referral Income + Other Comp/Recovery
```

### COGS logic (current implementation — see §6 for the planned change)

| Resolved order status | COGS charged | Rationale |
|---|---|---|
| Delivered / Exchange | 100% | Customer kept the item — genuine sale |
| RTO | 0% (`--rto-loss-rate`, default 0.0) | Assumed to return to inventory resellable |
| Customer Return | 100% (`--return-loss-rate`, default 1.0) | Assumed damaged/swapped/unsellable in most real cases (seller's own judgment call, not a measured rate) |
| Lost (courier) | 100% (`--lost-loss-rate`, default 1.0) | Item genuinely gone |
| Cancelled | 0% | Never shipped |
| Unresolved/Shipped (outcome not yet known) | 0% (`--unresolved-loss-rate`, default 0.0) | Conservative — don't charge cost until outcome confirmed |

Every rate above is a **CLI flag**, not a hardcoded constant, specifically
so the seller's real-world return/damage experience can be dialed in
without touching code.

### What's deliberately account-level, not per-SKU

Ads Cost is billed by Campaign ID with **no SKU or order linkage** in
Meesho's export — there is no legitimate way to allocate it per-SKU without
inventing an allocation rule Meesho doesn't provide. It's subtracted from
the *overall* P&L only. Same for Referral Payments and Compensation/Recovery.

---

## 4. Validated against reality (this is the important part)

We independently reconciled the entire pipeline against an actual HDFC bank
statement for the same period (Aug 2026), not just Meesho's self-reported
numbers.

```
Order Settlement (Payment File)     ₹71,059.59
− Ads Cost (Payment File)          −₹11,555.37
────────────────────────────────────────────────
= Expected bank credit               ₹59,504.22

Actual HDFC bank statement:
  20 NEFT credits, ALL from "MEESHO TECHNOLOGIES PRIVATE LIMITED"
  Statement Summary "Credits" line:   ₹59,504.22   ← EXACT MATCH
```

This proves two things simultaneously: (1) Meesho nets ad spend directly
against order settlement before crediting the bank — it is not billed
through a separate wallet — and (2) our settlement + ads arithmetic exactly
predicts real money movement, to the paisa. This is strong independent
validation that the revenue/ads side of the pipeline has zero hidden error.

**Not yet bank-verified:** the Aug 13 – Sep 11 2026 run (see §7) — the
same check should be repeated whenever a new bank statement is available.
COGS, by its nature, can never be bank-verified this way (it's the seller's
internal cost, invisible to Meesho and the bank) — see §5 for what that
means for overall confidence.

---

## 5. What we're still NOT sure about (be honest about this in the UI)

Don't present the final "Net Profit" number as more certain than it is.
Specifically:

1. **SKU cost accuracy is trusted, not verified.** There's no independent
   statement to check it against the way there is for revenue. If a cost is
   stale or incomplete (e.g. missing thread/labor/wastage), profit is wrong
   by exactly that amount and nothing in the pipeline would catch it.
2. **The RTO 0% / Return 100% split is a policy judgment, not a measured
   fact.** No actual tracking exists yet of what fraction of returned
   parcels come back resellable vs. damaged. Worth eventually validating by
   physically logging returned-parcel condition for a month or two.
3. **Packaging cost is currently zero everywhere.** This is exactly what
   the v2 rebuild (§6) is meant to fix.
4. **Orphan "unresolved" orders** (1-3 per period so far) default to zero
   COGS, which is a guess dressed as a rule.
5. **TCS/TDS are baked into `Final Settlement Amount`** as if permanent
   costs, but TCS is adjustable against GST liability and TDS against
   income tax at ITR time — so monthly cash-basis profit is accurate, but
   true annual profit (post-ITR) will run a bit higher than the sum of
   monthly numbers suggests.

None of this means the numbers are wrong — it means the *proven* part is
revenue and ad spend (§4), and the *judgment* part is cost and loss
assumptions. Keep that distinction visible in whatever UI gets built.

---

## 6. Planned v2 (seller's own direction — build this next)

Current cost file is flat: `{"SKU": unit_cost}`. Planned schema:

```json
{
  "SKU_CODE": {
    "making_cost": 60,
    "packaging_cost": 8
  }
}
```

New COGS rule per the seller's own stated logic:

| Outcome | Making cost charged? | Packaging cost charged? | Rationale |
|---|---|---|---|
| Delivered / Exchange | Yes | Yes | Normal completed sale |
| RTO | No | **Yes** | Product intact and resellable, but the packaging used to ship it is gone either way |
| Customer Return | **Yes** | **Yes** | Assumed damaged/lost/unusable in most real cases — full loss, not just packaging |
| Cancelled | No | No | Never shipped, nothing was consumed |
| Lost (courier) | Yes | Yes | Item genuinely gone (unchanged from v1) |

This is a materially different (more conservative on RTO, same on Return)
model than the current flat-cost implementation — implement it as a clean
replacement of `apply_cogs()`'s cost lookup and fraction logic, keeping the
same per-status resolution machinery from §3.

### Stated target architecture (seller's own words, for context — not something we've built)

- A JSON/Excel file holding `making_cost` + `packaging_cost` per SKU, edited
  directly by the seller.
- A "nice and intuitive UI" on top of the calculation.
- Packaged and run as a **Docker container**, invoked periodically (not a
  long-running service) each time a new Payment File is available.

---

## 7. Results so far (for reference / regression-testing a rebuild)

| Period (payment window) | Net Settlement | COGS | Ads Cost | **Net Profit** |
|---|---:|---:|---:|---:|
| 2026-08-01 → 2026-08-31 | ₹71,059.59 | ₹46,145.00 | ₹11,555.37 | **₹13,359.22** |
| 2026-08-13 → 2026-09-11 | ₹110,855.56 | ₹68,305.00 | ₹10,143.35 | **₹32,407.21** |

(Both computed with RTO=0% / Return=100% / Lost=100% / Unresolved=0% loss
rates, and the full 55-SKU flat-cost file. These will change once v2's
making-cost/packaging-cost split is implemented — use them only as a
regression check that a rewritten pipeline reproduces the same v1 numbers
before switching to the new cost model.)

---

## 8. File manifest (what's being handed over)

| File | What it is |
|---|---|
| `meesho_pnl.py` | The full calculator (CLI script, Python/pandas). Fully commented — the module docstring alone covers most of §3. |
| `sku_costs.json` | Current flat per-unit cost for all 55 known SKUs. |
| `sku_wise_pnl_aug2026.csv`, `overall_pnl_aug2026.json`, `pending_orders_aug2026.csv` | Aug 2026 run outputs. |
| `sku_wise_pnl_aug13_sep11_2026.csv`, `overall_pnl_aug13_sep11_2026.json` | Aug13–Sep11 2026 run outputs. |

### Current CLI

```bash
python meesho_pnl.py \
  --payment-file "4497632_SP_ORDER_ADS_REFERRAL_PAYMENT_FILE_..._<start>_<end>.xlsx" \
  --sku-cost-file sku_costs.json \
  --output-dir ./pnl_output \
  [--orders-file "Orders_....csv"]            # optional, pending-orders visibility only \
  [--rto-loss-rate 0.0] \
  [--return-loss-rate 1.0] \
  [--lost-loss-rate 1.0] \
  [--unresolved-loss-rate 0.0]
```

If `--sku-cost-file` doesn't exist yet, the script auto-generates a template
from every SKU found in the data (values set to `null`) and exits, so a
fresh setup is self-bootstrapping.