# HANDOFF TEMPLATE — Add Subscription + Payment System to Any Website

> **For an AI agent in a fresh session, working with ANY project (not just GITPAGE_TEST).**
>
> This document is a portable template for adding subscription + payment functionality to an existing web project. All project-specific values are marked as `${VARIABLE}`. Fill in the intake section below, and this becomes a working guide for your specific setup.

---

## ❓ Pre-Flight: Answer These First

Before using this template, you (the user) must decide:

| # | Question | Your Answer | Examples |
|---|----------|-------------|----------|
| 1 | What's your **current website framework**? | — | Astro, Next.js, React, Vue, plain HTML, other |
| 2 | Where is it **currently hosted**? | — | Cloudflare Pages, Vercel, AWS, GitHub Pages, custom server |
| 3 | Which **payment service** do you use? | — | Toss Payments (KR), Stripe (global), Paddle, Lemonsqueezy |
| 4 | Which **database**? | — | Cloudflare D1, PostgreSQL, MongoDB, Supabase, Firebase |
| 5 | Which **email provider**? | — | Resend, SendGrid, AWS SES, Mailgun |
| 6 | Do you have **server functions / serverless** capability? | yes / no | Cloudflare Workers, Vercel Functions, AWS Lambda, custom API |

**If you answered "no" to #6**, you'll need to set that up first. Subscription + payment requires a backend.

---

## INTAKE — Fill This In

Before the AI starts, provide these values. They'll replace all `${VARIABLE}` placeholders.

| Variable | Description | Example |
|----------|-------------|---------|
| `${PROJECT_NAME}` | Your project name (used in docs, folder names) | `my-blog`, `saas-tool`, `newsletter-app` |
| `${GITHUB_USERNAME}` | Your GitHub username | `alice-dev`, `company-org` |
| `${GITHUB_REPO}` | Repository name on GitHub | `blog`, `website`, `app` |
| `${SITE_URL}` | Current live website URL | `https://alice.dev`, `https://myapp.pages.dev` |
| `${FRAMEWORK}` | Web framework (from Pre-Flight #1) | `astro`, `next`, `react`, `vue` |
| `${HOSTING}` | Hosting platform (from Pre-Flight #2) | `cloudflare-pages`, `vercel`, `aws`, `custom` |
| `${PAYMENT_SERVICE}` | Payment processor (from Pre-Flight #3) | `toss`, `stripe`, `paddle` |
| `${DATABASE_TYPE}` | Database choice (from Pre-Flight #4) | `d1`, `postgresql`, `mongodb`, `supabase` |
| `${EMAIL_PROVIDER}` | Email service (from Pre-Flight #5) | `resend`, `sendgrid`, `aws-ses` |
| `${API_FRAMEWORK}` | Backend/serverless framework (from Pre-Flight #6) | `cloudflare-workers`, `vercel-functions`, `custom-api` |
| `${CURRENCY}` | Currency for payments | `KRW`, `USD`, `EUR` |
| `${TIMEZONE}` | Your timezone | `Asia/Seoul`, `America/New_York` |
| `${TOSS_TEST_MODE}` | Start in Toss test mode? (if using Toss) | `true` (recommended) |

**Example filled in** (for Toss Payments, Korea, Cloudflare):
```
${PROJECT_NAME} = gitpage-test
${GITHUB_USERNAME} = oinbun5-collab
${GITHUB_REPO} = GITPAGE_TEST
${SITE_URL} = https://gitpage-test.pages.dev
${FRAMEWORK} = astro
${HOSTING} = cloudflare-pages
${PAYMENT_SERVICE} = toss
${DATABASE_TYPE} = d1
${EMAIL_PROVIDER} = resend
${API_FRAMEWORK} = cloudflare-workers
${CURRENCY} = KRW
${TIMEZONE} = Asia/Seoul
${TOSS_TEST_MODE} = true
```

---

## 1. Architecture: Subscription + Payment System

### 1.1 System Overview (Generic)

```
┌──────────────────────────────────────────────────────────┐
│ Your Website (${SITE_URL})                               │
│                                                          │
│  ┌──────────────────────────┐                           │
│  │ Frontend                 │                           │
│  │ (${FRAMEWORK})           │                           │
│  │                          │                           │
│  │ /subscribe (form)        │                           │
│  └──────────────────────────┘                           │
│         │                                               │
│         └─ POST /api/subscribe                          │
│         └─ POST /api/checkout                           │
│                                                          │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────▼──────────────┐
        │ Serverless Backend        │
        │ (${API_FRAMEWORK})        │
        │                           │
        │ - /api/subscribe          │
        │ - /api/checkout           │
        │ - /webhooks/payment       │
        └────────────┬──────────────┘
                     │
    ┌────────────────┼────────────────┬──────────────────┐
    │                │                │                  │
┌───▼────┐  ┌────────▼──────┐  ┌──────▼────────┐  ┌────▼──────────┐
│Database│  │Payment Service│  │Email Provider │  │Analytics      │
│        │  │               │  │               │  │(optional)     │
│${DB}   │  │${PAYMENT_SVC} │  │${EMAIL_PROV}  │  │               │
│        │  │               │  │               │  │               │
│Tables: │  │ - Initiate    │  │ - Welcome     │  │- Track signup │
│- subs  │  │ - Confirm     │  │ - Receipt     │  │- Track payment│
│- pays  │  │ - Webhook     │  │ - Unsubscribe│  │               │
│- orders│  │               │  │               │  │               │
└────────┘  └───────────────┘  └───────────────┘  └────────────────┘
```

### 1.2 User Flow (Language-Agnostic)

```
1. User visits /subscribe
2. Chooses plan: free (email) or paid (email + payment)
3. [If free] → email only → confirm → welcome email → done
4. [If paid] → email → redirect to payment gateway
5. Complete payment on ${PAYMENT_SERVICE}
6. Webhook: backend receives payment confirmation
7. Backend: insert into ${DATABASE_TYPE}
8. Backend: send email (receipt / welcome)
9. Database: subscription record active
```

### 1.3 Data Schema (Generic SQL)

```sql
-- All subscriptions
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',  -- 'active' | 'cancelled' | 'suspended'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT  -- JSON: source, utm_params, etc
);

-- Payment records (plan != 'free')
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  payment_service_order_id TEXT UNIQUE,  -- Toss order, Stripe invoice, etc
  payment_service_payment_id TEXT,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'success' | 'failed'
  result_code TEXT,
  result_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

-- Subscription periods
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  payment_id INTEGER,
  plan_type TEXT,
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

### Phase A: Assess Current Setup

**Checklist:**
- [ ] Existing codebase location: `${GITHUB_REPO}`
- [ ] Hosting is live at: `${SITE_URL}`
- [ ] Can you deploy backend code? (${API_FRAMEWORK} available)
- [ ] Do you have database credentials? (${DATABASE_TYPE})
- [ ] Payment account created? (${PAYMENT_SERVICE})
- [ ] Email provider account ready? (${EMAIL_PROVIDER})

**If any NO:** Go set those up first. (See pre-flight checklist.)

**Time:** 15 min

---

### Phase B: Create Backend (Subscription + Payment API)

**What to build:**
- `POST /api/subscribe` — email signup (free tier)
- `POST /api/checkout` — initiate payment on ${PAYMENT_SERVICE}
- `POST /webhooks/${PAYMENT_SERVICE}` — payment confirmation

**Database:**
- Create `${DATABASE_TYPE}` database named `${PROJECT_NAME}_db`
- Run migration SQL from §1.3
- Link credentials to backend environment

**Email:**
- Get API key from ${EMAIL_PROVIDER}
- Create email templates (welcome, receipt)
- Test email sending

**Payment Service:**
- Create account on ${PAYMENT_SERVICE}
- Get test API keys (start with sandbox/test mode)
- Configure webhook URL: `${SITE_URL}/webhooks/${PAYMENT_SERVICE}`

**Time:** 90–120 min

---

### Phase C: Build Frontend (Subscription Form)

**What to build:**
- Component: subscription form (email input, plan selector)
- Page: `/subscribe` — form layout
- Page: `/subscribe/success` — confirmation
- Integrate ${PAYMENT_SERVICE} checkout button (if paid tier)

**${FRAMEWORK} specifics:**
- Astro: `.astro` components + form handling
- Next.js: React components + API routes
- Vue: `.vue` components + form handling
- React: functional components + state

**Time:** 45 min

---

### Phase D: Payment Gateway Integration

**${PAYMENT_SERVICE} specific:**
- Load ${PAYMENT_SERVICE} SDK in your site
- Create checkout button/form
- Handle payment result (success/fail redirect)
- Test with ${PAYMENT_SERVICE} test credentials

**Common providers:**
- **Toss Payments**: TossPayments.loadPaymentWidget()
- **Stripe**: stripe.redirectToCheckout()
- **Paddle**: paddle.Checkout.open()

**Time:** 60 min

---

### Phase E: Email Notifications

**Templates to create:**
- Welcome email (free tier)
- Receipt email (paid tier)
- Unsubscribe confirmation (optional)

**${EMAIL_PROVIDER} specifics:**
- Resend: API calls + template variables
- SendGrid: dynamic templates
- AWS SES: raw email or MIME

**Time:** 30 min

---

## 3. Testing Checklist (Before Live)

```
Phase A:
  [ ] All 6 pre-flight answers confirmed
  [ ] ${GITHUB_REPO} cloned / local

Phase B:
  [ ] Backend deployed to ${API_FRAMEWORK}
  [ ] ${DATABASE_TYPE} connected + tables created
  [ ] ${EMAIL_PROVIDER} test email works
  [ ] ${PAYMENT_SERVICE} test credentials loaded

Phase C:
  [ ] /subscribe page loads
  [ ] Form renders (free + paid tabs, if applicable)
  [ ] Form submits without errors

Phase D:
  [ ] ${PAYMENT_SERVICE} checkout widget appears
  [ ] Can initiate test payment
  [ ] Webhook received + logged

Phase E:
  [ ] Welcome email arrives (free signup)
  [ ] Receipt email arrives (paid signup)

Full Integration:
  [ ] End-to-end signup → payment → email → database
  [ ] All subscriber records in ${DATABASE_TYPE}
  [ ] Ready for live payments
```

---

## 4. Platform-Specific Setup Notes

### If ${HOSTING} = `cloudflare-pages`

Environment variables in `wrangler.toml`:
```toml
[env.production]
vars = { PAYMENT_SERVICE = "${PAYMENT_SERVICE}", }
```

Secrets:
```bash
wrangler secret put PAYMENT_SERVICE_API_KEY  # your ${PAYMENT_SERVICE} key
wrangler secret put EMAIL_API_KEY            # your ${EMAIL_PROVIDER} key
wrangler secret put DATABASE_URL             # your ${DATABASE_TYPE} connection
```

### If ${HOSTING} = `vercel`

Environment variables in `.env.local` (or Vercel dashboard):
```
NEXT_PUBLIC_SITE_URL=${SITE_URL}
PAYMENT_SERVICE_API_KEY=...
EMAIL_API_KEY=...
DATABASE_URL=...
```

### If ${HOSTING} = `custom-api`

Depends on your setup. Provide `.env` template at root:
```
NODE_ENV=production
SITE_URL=${SITE_URL}
PAYMENT_API_KEY=...
EMAIL_API_KEY=...
DB_HOST=...
DB_PASSWORD=...
```

---

## 5. Passing This to Another AI Session

If you're handing off to a fresh AI (or another person's AI):

1. **Fill in the INTAKE section above** (all `${VARIABLE}` values)
2. **Save as a new file**: `HANDOFF_${PROJECT_NAME}_SUBSCRIPTION.md`
3. **Share with the AI**: "Here's the intake + phases. Fill out phases B–E."

Example for handoff:
```
${PROJECT_NAME} = my-newsletter
${GITHUB_USERNAME} = alice-dev
${GITHUB_REPO} = newsletter-app
${SITE_URL} = https://my-newsletter.app
${FRAMEWORK} = next
${HOSTING} = vercel
${PAYMENT_SERVICE} = stripe
${DATABASE_TYPE} = postgresql
${EMAIL_PROVIDER} = resend
${API_FRAMEWORK} = vercel-functions
${CURRENCY} = USD
${TIMEZONE} = America/New_York
```

---

## 6. Reference: ${PAYMENT_SERVICE} Specific Commands

### If ${PAYMENT_SERVICE} = `toss`

Test card: `4000-0000-0000-0002`
Webhook endpoint format: `POST /webhooks/toss-payment`
Test mode API: `https://api.tosspayments.com/v1/...`

### If ${PAYMENT_SERVICE} = `stripe`

Test card: `4242-4242-4242-4242`
Webhook endpoint format: `POST /webhooks/stripe`
Test mode API: `https://api.stripe.com/v1/...`

### If ${PAYMENT_SERVICE} = `paddle`

Test card: `4242-4242-4242-4242` (same as Stripe)
Webhook format: POST, with signature verification
Test mode API: `https://sandbox-api.paddle.com/...`

---

## 7. Quick Reference: File Paths (Generic)

```
${GITHUB_REPO}/
├── functions/  (or api/ for Next.js)
│   ├── api/
│   │   ├── subscribe.ts          # Free tier signup
│   │   └── checkout.ts           # Payment initiation
│   ├── webhooks/
│   │   └── ${PAYMENT_SERVICE}-payment.ts  # Payment webhook
│   ├── utils/
│   │   ├── db.ts                 # DB queries
│   │   ├── email.ts              # Email sending
│   │   └── payment.ts            # ${PAYMENT_SERVICE} API
│   └── emails/
│       ├── welcome.html
│       └── receipt.html
│
├── src/  (or pages/ for Next.js)
│   ├── components/
│   │   └── SubscribeForm.${EXT}  # (.astro | .tsx | .vue)
│   └── pages/
│       └── subscribe/
│           ├── index.${EXT}      # Form page
│           └── success.${EXT}    # Confirmation
│
├── wrangler.toml  (if ${HOSTING} = cloudflare-pages)
├── .env.local     (if ${HOSTING} = vercel | custom)
└── [database migration SQL]
```

---

## 8. Troubleshooting: Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Webhook not firing | Wrong endpoint URL in ${PAYMENT_SERVICE} dashboard | Verify `${SITE_URL}/webhooks/${PAYMENT_SERVICE}` is registered |
| Email not sending | Missing ${EMAIL_PROVIDER} API key | Check environment variables + test with mock email |
| Payment amount mismatch | Cents vs dollars confusion | Ensure backend stores amount_cents (e.g., 5000 = 50 KRW) |
| Database not found | Credentials not passed to backend | Check ${DATABASE_TYPE} connection string in env |
| Form not submitting | CORS issue between frontend + backend | Check backend CORS headers allow your ${SITE_URL} |

---

## 9. Success Criteria (Ship When All ✓)

```
[ ] All ${VARIABLE} values filled in
[ ] Phase A checklist complete
[ ] Backend deployed + endpoints respond
[ ] Database populated with test subscriber
[ ] Test email arrives
[ ] Test payment completes (using ${PAYMENT_SERVICE} test mode)
[ ] Webhook fires + DB updated
[ ] /subscribe page live at ${SITE_URL}
[ ] Can do full signup → payment → email → DB flow
```

---

**End of template.** To use:
1. Fill in INTAKE section (all 12 variables)
2. Follow phases B–E
3. Test against checklist
4. Go live
