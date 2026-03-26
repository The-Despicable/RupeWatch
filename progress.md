# RupeWatch Progress

## Overview

RupeWatch is a financial tracking dashboard with real-time exchange rates, gold prices, AI predictions, news feeds, alerts system, and subscription payments.

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + Material Symbols
- **Auth**: Clerk Authentication
- **Database**: Prisma + SQLite (local) / Turso (production - pending)
- **AI**: DeepSeek API for predictions
- **Payments**: Razorpay + UPI
- **Notifications**: Telegram Bot
- **Deployment**: Vercel

---

## ✅ Completed Tasks

### Core Infrastructure
- [x] Next.js 15 project with TypeScript and Tailwind CSS
- [x] Clerk authentication configured with middleware
- [x] Material Symbols font configured
- [x] Dashboard page with live rates

### Database (Prisma Schema)
- [x] User model with telegramChatId field
- [x] Alert model for price alerts
- [x] Subscription model for payments
- [x] RateHistory model for price tracking

### API Routes Created
- [x] `/api/rates` - Exchange rates (Frankfurter fallback)
- [x] `/api/prev-rates` - Previous day rates
- [x] `/api/gold` - Gold/Silver prices in INR (GoldAPI + 12% India markup)
- [x] `/api/metals` - Precious metals spot prices (USD)
- [x] `/api/news` - News feed via rss2json
- [x] `/api/analyze` - DeepSeek AI predictions
- [x] `/api/alerts/route.ts` - Alert CRUD
- [x] `/api/alerts/[id]/route.ts` - Single alert operations
- [x] `/api/alerts/check/route.ts` - AI-powered alert checker
- [x] `/api/razorpay/order/route.ts` - Create Razorpay order
- [x] `/api/razorpay/verify/route.ts` - Verify payment + create subscription
- [x] `/api/subscription/route.ts` - Subscription management
- [x] `/api/prices/route.ts` - Update all prices (cron)
- [x] `/api/prices/history/route.ts` - Get price history
- [x] `/api/user/telegram/route.ts` - Connect/disconnect Telegram
- [x] `/api/telegram/webhook/route.ts` - Telegram bot webhook

### Pages Implemented
- [x] `/dashboard` - Main dashboard with rates, charts, news
- [x] `/analysis` - Precious metals analysis
- [x] `/alerts` - Alert management
- [x] `/upgrade` - Subscription plans with UPI/Razorpay
- [x] `/settings` - User settings & Telegram connection
- [x] `/` - Root page with auth redirect

### Components Created
- [x] `PricePredictionCard.tsx` - AI prediction display
- [x] `NewsSection.tsx` - News feed
- [x] `TrendAnalysis.tsx` - Trend visualization

### Payment System
- [x] UPI deep links (GPay, PhonePe, Paytm)
- [x] Dynamic QR code generation
- [x] Razorpay integration
- [x] Three plans: Weekly (₹7), Monthly (₹50), Master (₹100)
- [x] Manual UPI confirmation flow

### Telegram Bot Integration
- [x] `@RupeeWatchBot` created
- [x] Bot token configured
- [x] Webhook set to Vercel
- [x] Commands: `/start`, `/help`, `/price`, `/gold`, `/silver`, `/rates`, `/status`, `/alerts`, `/id`
- [x] Alert notifications sent when triggered
- [x] Settings page for connecting Telegram

### Deployment
- [x] GitHub repo: https://github.com/The-Despicable/RupeWatch
- [x] Vercel deployment: https://rupewatch.vercel.app
- [x] Framework detection fixed (Next.js)
- [x] Environment variables added:
  - [x] `NEXT_PUBLIC_APP_URL` = `https://rupewatch.vercel.app`
  - [x] `CLERK_SECRET_KEY` (real key)
  - [x] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (real key)
  - [x] `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
  - [x] `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-in`
  - [x] `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `/dashboard`
  - [x] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` = `/dashboard`
  - [x] `TELEGRAM_BOT_TOKEN` = `8770930709:AAGtzj6yuQgnj3mRH_nC5gXGdwAUWOTgHGU`

---

## 🔴 Pending Tasks (Next Session)

### Database (Critical)
- [ ] **Set up Turso database** for production
  - Create account at https://turso.tech
  - Create database
  - Get `DATABASE_URL` and `TURSO_AUTH_TOKEN`
  - Add to Vercel environment variables
  - Update `prisma/schema.prisma` for Turso (or use libSQL)

### Environment Variables Needed
- [ ] `DATABASE_URL` - Turso connection string
- [ ] `TURSO_AUTH_TOKEN` - Turso auth token

### Optional Environment Variables
- [ ] `DEEPSEEK_API_KEY` - For AI predictions (if not already set)
- [ ] `GOLDAPI_KEY` - For premium gold API
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` - For payments
- [ ] `RAZORPAY_KEY_SECRET` - For payments
- [ ] `CRON_SECRET` - For securing cron endpoints

### Testing & Verification
- [ ] Test user signup/login flow
- [ ] Test creating alerts
- [ ] Test Telegram bot connection
- [ ] Test alert notifications

### Features to Add
- [ ] Add more currency pairs (AED, JPY, CNY)
- [ ] PWA support
- [ ] Mobile app version
- [ ] Set up cron job for alert checking (Vercel Cron or external)
- [ ] Telegram webhook verification endpoint

### Documentation
- [ ] Update README with setup instructions
- [ ] Add environment variable template

---

## File Structure

```
RupeWatch/
├── .env.local                    # Environment variables (local)
├── vercel.json                   # Vercel configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts           # Tailwind config
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── dev.db                   # SQLite database (local)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Root page (auth redirect)
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   ├── dashboard/
│   │   ├── analysis/
│   │   ├── alerts/
│   │   ├── upgrade/
│   │   ├── settings/
│   │   └── api/
│   │       ├── rates/
│   │       ├── gold/
│   │       ├── metals/
│   │       ├── news/
│   │       ├── alerts/
│   │       ├── razorpay/
│   │       ├── subscription/
│   │       ├── telegram/
│   │       ├── user/
│   │       └── prices/
│   ├── components/
│   │   ├── PricePredictionCard.tsx
│   │   ├── NewsSection.tsx
│   │   └── TrendAnalysis.tsx
│   ├── lib/
│   │   ├── db.ts               # Prisma client
│   │   ├── deepseek.ts         # AI helper
│   │   ├── gold.ts             # Gold price fetching
│   │   ├── priceFetcher.ts    # Unified price fetching
│   │   ├── telegram.ts         # Telegram notifications
│   │   └── user.ts            # User helpers
│   └── middleware.ts           # Clerk auth middleware
└── progress.md                  # This file
```

---

## Commands Reference

### Local Development
```bash
cd RupeWatch
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Lint code
npx prisma db push   # Push schema to DB
npx prisma generate  # Generate Prisma client
```

### Vercel Deployment
```bash
npx vercel --prod --yes --token <TOKEN>
```

### Telegram Bot Commands
- `/start` - Welcome message
- `/help` - Help
- `/price` - Get all prices
- `/gold` - Get gold price
- `/silver` - Get silver price
- `/rates` - Get exchange rates
- `/status` - Check subscription
- `/alerts` - View alerts
- `/id` - Get chat ID

### Vercel Environment Variable API
```bash
# Add env var
curl -X POST "https://api.vercel.com/v10/projects/<PROJECT_ID>/env" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"key":"KEY","value":"value","type":"plain","target":["production"]}'

# Update env var
curl -X PATCH "https://api.vercel.com/v10/projects/<PROJECT_ID>/env/<ENV_ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"value":"new_value"}'
```

---

## Quick Resume Checklist

Before continuing tomorrow:

1. [ ] Have Turso credentials ready (DATABASE_URL, TURSO_AUTH_TOKEN)
2. [ ] Verify Clerk keys are correct in Vercel dashboard
3. [ ] Check Telegram webhook is working: `https://rupewatch.vercel.app/api/telegram/webhook`
4. [ ] Test main page loads: `https://rupewatch.vercel.app/`

---

## Last Updated

March 26, 2026
