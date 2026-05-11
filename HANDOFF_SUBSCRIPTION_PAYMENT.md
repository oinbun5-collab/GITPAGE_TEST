# HANDOFF — Add Subscription + Payment System to GITPAGE_TEST

> **For an AI agent in a fresh session.** This document hands off the subscription + payment system design for GITPAGE_TEST, which is already deployed to Cloudflare Pages.

---

## 0. Current Status

✅ **Complete**:
- GitHub Pages → Cloudflare Pages migration (2026-05-11)
- sites/public (Astro Fuwari) deployed to `https://gitpage-test.pages.dev`
- Base URL fixed to `/` (root domain) — CSS and images now load correctly
- Git repo migrated from `negalab/GITPAGE_TEST` to `oinbun5-collab/GITPAGE_TEST`

⏳ **Pending**:
- Deploy sites/personal (Quartz v4) to separate Cloudflare Pages project
- Design subscription + payment system (Phase 1: architecture, Phase 2: implementation)

---

## 1. Architecture: Subscription + Payment System

### 1.1 System Overview

```
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Pages (gitpage-test.pages.dev)                   │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │ Astro Public Site    │      │ Quartz Personal Site │    │
│  │ (sites/public/dist)  │      │ (sites/personal/)    │    │
│  └──────────────────────┘      └──────────────────────┘    │
│         │                                                    │
│         └─ /subscribe (form) ──────────────┐                │
│                                            │                │
└────────────────────────────────────────────┼────────────────┘
                                             │
                        ┌────────────────────▼──────────────────┐
                        │ Cloudflare Worker (Serverless Fn)     │
                        │                                        │
                        │ POST /api/subscribe                    │
                        │ POST /api/checkout (Toss webhook)     │
                        └────────────────────┬──────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────┐
                    │                        │                    │
        ┌───────────▼──────────┐  ┌─────────▼──────────┐  ┌─────▼──────────────┐
        │ Cloudflare D1        │  │ Toss Payments API  │  │ Email (Resend or   │
        │ Database             │  │ (결제 처리)         │  │ SendGrid)          │
        │                      │  │                    │  │ (확인 메일 발송)    │
        │ Tables:              │  │ - 결제 신청        │  │                    │
        │ - subscribers        │  │ - 결제 완료 webhook│  │ - 가입 확인         │
        │ - payments           │  │                    │  │ - 영수증            │
        │ - orders             │  └────────────────────┘  └────────────────────┘
        └──────────────────────┘
```

### 1.2 User Flow

```
1. User visits /subscribe on public site
2. Fills form: email, plan choice (free/paid)
   - Free: email only → confirm immediately → welcome email
   - Paid: email + payment method → redirect to Toss checkout
3. Toss returns payment result (success/fail)
4. Webhook: Cloudflare Worker receives Toss confirmation
5. Worker: insert into D1 database (subscribers + payments)
6. Worker: send welcome/receipt email
7. Database: subscriber record created, can receive emails
```

### 1.3 Data Schema (D1 Database)

```sql
-- Subscribers table
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',  -- 'free' | 'paid_monthly' | 'paid_annual'
  status TEXT DEFAULT 'active',  -- 'active' | 'cancelled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT  -- JSON, e.g. {"source": "public_site", "utm_source": "..."}
);

-- Payment records (only for plan != 'free')
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  toss_order_id TEXT UNIQUE NOT NULL,
  toss_payment_id TEXT,
  amount_cents INTEGER,  -- 금액 (센트 단위)
  currency TEXT DEFAULT 'KRW',
  status TEXT DEFAULT 'pending',  -- 'pending' | 'success' | 'failed' | 'cancelled'
  result_code TEXT,  -- Toss 결과 코드
  result_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

-- Orders table (tracks subscription periods)
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  payment_id INTEGER,
  plan_type TEXT,  -- 'paid_monthly' | 'paid_annual'
  period_start DATE,
  period_end DATE,
  auto_renew BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);
```

---

## 2. Implementation Phases

### Phase A: Deploy sites/personal (Quartz) to Cloudflare Pages

**Files to modify:**
- `sites/personal/quartz.config.ts` — update `baseUrl` to Cloudflare Pages URL
- Optional: add custom domain setup instructions

**Steps:**
1. In Cloudflare Pages, create new project: "gitpage-test-personal"
2. Connect GitHub repo `oinbun5-collab/GITPAGE_TEST`
3. Set build framework: Static
4. Build command: `cd sites/personal && npm install && npx quartz build`
5. Output directory: `sites/personal/public`
6. Deploy and verify at `gitpage-test-personal.pages.dev`

**Estimated time:** 15 min

---

### Phase B: Create Cloudflare Worker + D1 Database (Subscription Backend)

**Files to create:**
- `functions/api/subscribe.ts` — POST handler for email signup (free tier)
- `functions/api/checkout.ts` — POST handler to initiate Toss payment
- `functions/webhooks/toss-payment.ts` — Toss payment confirmation webhook
- `functions/utils/db.ts` — D1 query helpers
- `functions/utils/email.ts` — Email sending (Resend or SendGrid)
- `wrangler.toml` — Cloudflare configuration

**D1 Setup:**
1. In Cloudflare dashboard, create D1 database: `gitpage-test-db`
2. Run migration SQL (create tables)
3. Link in wrangler.toml

**Estimated time:** 90 min (design + implementation)

---

### Phase C: Build Subscription Form Component (Astro)

**Files to create/modify:**
- `sites/public/src/components/SubscribeForm.astro` — two-tab form (free/paid)
  - Free tab: email input + submit
  - Paid tab: email + plan dropdown + "proceed to payment" button
- `sites/public/src/pages/subscribe/index.astro` — full subscription page
- `sites/public/src/pages/subscribe/success.astro` — confirmation page

**Estimated time:** 45 min

---

### Phase D: Toss Payments Integration (Checkout Flow)

**Prerequisites:**
- Toss Payments account created (test mode only for now)
- API keys obtained (Client Key, Secret Key)
- Toss SDK loaded in Astro pages

**Files to create:**
- `sites/public/src/components/TossPaymentButton.tsx` (Svelte) — Toss checkout widget
- `sites/public/src/pages/api/toss-checkout.ts` — payment initiation
- Webhook receiver: `functions/webhooks/toss-payment.ts` (Phase B)

**Estimated time:** 60 min

---

### Phase E: Email Integration (Confirmations + Welcome)

**Provider choice (user decides):**
- Resend (Korean support, free tier OK)
- SendGrid (established, but needs billing info)

**Files to create:**
- Email templates: `functions/emails/welcome.html`, `functions/emails/receipt.html`
- `functions/utils/email.ts` — send functions

**Estimated time:** 30 min

---

## 3. Architecture Decisions to Confirm with User

Before Phase B starts, ask the user (one time, briefly):

| Decision | Options | Default | Why |
|----------|---------|---------|-----|
| **Free tier only?** | yes / no | no (support both) | Grow audience first, monetize later, or immediate revenue? |
| **Payment plans** | monthly only / monthly + annual | both | User preference on pricing flexibility |
| **Email provider** | Resend / SendGrid / other | Resend | Korean support, simpler setup |
| **Toss billing** | test mode (sandbox) / live | test mode | Always start here; upgrade after testing |
| **Domain custom name** | yes / no / later | later | Cloudflare Pages subdomain is fine for MVP |

---

## 4. Remaining Decisions (Use §3 Defaults if Not Asked)

- Database backups: automatic (Cloudflare D1 handles)
- Email list export: defer (implement later if needed)
- Unsubscribe flow: simple "mark inactive" in DB (no double-opt-out for now)
- Payment retry logic: Toss handles; worker just records result

---

## 5. Testing Checklist (Before Going Live)

```
Phase A (Quartz Deploy):
  [ ] sites/personal built locally: npm run build produces /public
  [ ] Cloudflare project created + linked
  [ ] Quartz homepage renders at gitpage-test-personal.pages.dev
  [ ] Graph view + wiki-links work

Phase B (Worker + D1):
  [ ] D1 database created + migration SQL applied
  [ ] Worker functions deploy without errors
  [ ] Test DB query: POST /api/test-db returns schema
  [ ] Email sending test: POST /api/test-email returns success

Phase C (Form):
  [ ] /subscribe page loads on public site
  [ ] Free form submits → creates subscriber in D1
  [ ] Confirmation email arrives
  [ ] Success page displays

Phase D (Toss):
  [ ] Toss SDK loads in browser (no errors)
  [ ] Toss payment widget renders
  [ ] Test payment completes (Toss test card)
  [ ] Webhook fires + DB updated with payment_id
  [ ] Receipt email arrives

Phase E (Full Integration):
  [ ] End-to-end: signup → payment → email → database record
```

---

## 6. File Structure (New files)

```
functions/
├── api/
│   ├── subscribe.ts          # POST /api/subscribe (free signup)
│   ├── checkout.ts           # POST /api/checkout (Toss initiate)
│   └── [test handlers]
├── webhooks/
│   └── toss-payment.ts       # POST /webhooks/toss-payment (Toss confirm)
├── utils/
│   ├── db.ts                 # D1 query helpers
│   ├── email.ts              # Resend/SendGrid wrapper
│   └── toss.ts               # Toss API helpers
└── emails/
    ├── welcome.html
    ├── receipt.html
    └── [other templates]

sites/public/src/
├── components/
│   ├── SubscribeForm.astro   # Main form component (free + paid tabs)
│   └── TossPaymentButton.tsx # Toss checkout widget
├── pages/
│   ├── subscribe/
│   │   ├── index.astro       # /subscribe form page
│   │   ├── success.astro     # /subscribe/success (confirm)
│   │   └── failed.astro      # /subscribe/failed (error fallback)
│   └── api/
│       └── toss-webhook.ts   # Webhook receiver (redundant if in functions/)

wrangler.toml                 # Cloudflare config (new)
```

---

## 7. Quick Start for Next Session

1. **Verify current state**:
   ```bash
   cd /Users/letsdooyoung/GITPAGE_TEST
   git log --oneline -5
   # expect: latest commit is "Fix Astro base URL for Cloudflare Pages..."
   ```

2. **Check current deployments**:
   - ✅ https://gitpage-test.pages.dev — should show Astro site with CSS + images
   - ❌ sites/personal — not deployed yet

3. **Start Phase A** (Quartz deploy):
   - Decision: use existing Cloudflare account? (yes, same account)
   - New project name: suggest "gitpage-test-personal"
   - Build command: `cd sites/personal && npm install && npx quartz build`

4. **After Phase A is live**, move to Phase B (Worker + D1).

---

## 8. Key Links & References

| Resource | URL |
|----------|-----|
| Cloudflare Pages Docs | https://developers.cloudflare.com/pages/ |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| D1 Database | https://developers.cloudflare.com/d1/ |
| Toss Payments Docs | https://docs.tosspayments.com/ |
| Toss Test Cards | https://docs.tosspayments.com/reference/test-card-numbers |
| Resend Email | https://resend.com/docs |

---

## 9. User Context (from Prior Session)

- **User**: MR_5PM (YouTube creator, AI content producer)
- **Goal**: Dual-site publishing + monetize via Toss Payments
- **Primary language**: Korean (formal ~습니다 style)
- **Input method**: Often voice-to-text
- **Preference**: foundation-first (working architecture > polished UI early)

---

**End of handoff.** A fresh AI session should:
1. ✅ Verify Phase A (Quartz deploy) — 15 min
2. ✅ Implement Phases B–E (subscription + payment) — ~240 min
3. ✅ Run testing checklist — ~60 min
4. Total: ~5 hours for fully working system
