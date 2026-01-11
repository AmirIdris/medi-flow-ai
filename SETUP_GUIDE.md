# MediaFlow AI - Setup Guide

## 🎉 Project Structure Created Successfully!

Your complete Next.js 14 application has been scaffolded with all the necessary files, configurations, and components.

## 📁 Project Structure

```
medi-flow-ai/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/              # Protected dashboard routes
│   ├── ai-lab/                   # AI summarizer page
│   ├── api/                      # API routes & webhooks
│   ├── download/[id]/            # Dynamic download page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── actions/                      # Server Actions
│   ├── download-action.ts
│   ├── ai-action.ts
│   └── user-action.ts
├── components/                   # React Components
│   ├── shared/                   # Navbar, Footer, MobileNav
│   ├── home/                     # Hero, Features
│   ├── download/                 # ResultCard, FormatPicker
│   └── dashboard/                # StatsCard, HistoryTable
├── hooks/                        # Custom Hooks
│   ├── use-copy-to-clipboard.ts
│   └── use-user-limits.ts
├── lib/                          # Configuration
│   ├── prisma.ts
│   ├── redis.ts
│   ├── stripe.ts
│   ├── chapa.ts
│   ├── openai.ts
│   └── utils.ts
├── services/                     # Business Logic
│   ├── video-service.ts
│   └── ai-service.ts
├── types/                        # TypeScript Types
│   ├── video.d.ts
│   ├── user.d.ts
│   ├── ai.d.ts
│   └── index.ts
├── styles/                       # Global CSS
│   └── globals.css
├── prisma/                       # Database Schema
│   └── schema.prisma
└── public/                       # Static Assets
    └── assets/
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/mediaflow

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Stripe Payment
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Chapa Payment
CHAPA_SECRET_KEY=your_chapa_secret_key
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret
NEXT_PUBLIC_CHAPA_PUBLIC_KEY=your_chapa_public_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# RapidAPI
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=your_rapidapi_host

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
FREE_DOWNLOAD_LIMIT=5
FREE_AI_SUMMARY_LIMIT=3
```

### 3. Initialize Shadcn/UI Components

```bash
npx shadcn-ui@latest init
```

When prompted, use these settings:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Add essential components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
```

### 4. Set Up Database

Generate Prisma client and push schema:

```bash
npx prisma generate
npx prisma db push
```

To view your database:

```bash
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 🔧 External Services Setup

### Clerk (Authentication)
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy API keys to `.env.local`

### Upstash Redis (Rate Limiting)
1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy REST URL and token to `.env.local`

### Stripe (Payments)
1. Sign up at [stripe.com](https://stripe.com)
2. Get API keys from dashboard
3. Set up webhook endpoint: `/api/webhooks/stripe`

### Chapa (Ethiopian Payments)
1. Sign up at [chapa.co](https://chapa.co)
2. Get API credentials
3. Set up webhook endpoint: `/api/webhooks/chapa`

### OpenAI (AI Features)
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add to `.env.local`

### RapidAPI (Video Downloads)
1. Sign up at [rapidapi.com](https://rapidapi.com)
2. Subscribe to video downloader API
3. Add API key to `.env.local`

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🎯 Key Features Implemented

### Authentication
- ✅ Clerk integration for user authentication
- ✅ Protected routes with middleware
- ✅ Sign in/Sign up pages

### Video Download
- ✅ Multi-platform support (YouTube, TikTok, Instagram, etc.)
- ✅ URL validation
- ✅ Format and quality selection
- ✅ Rate limiting
- ✅ User download limits

### AI Features
- ✅ Video transcription with Whisper
- ✅ AI-powered summaries with GPT-4
- ✅ Multiple summary levels (Short, Medium, Detailed)
- ✅ Sentiment analysis

### Payment Integration
- ✅ Stripe for international payments
- ✅ Chapa for Ethiopian payments
- ✅ Webhook handlers
- ✅ Plan management

### Dashboard
- ✅ Usage statistics
- ✅ Download history
- ✅ AI summary history
- ✅ Account settings

## 🔨 Next Steps

1. **Configure External Services**: Set up all the external services listed above
2. **Add UI Components**: Complete the Shadcn/UI setup
3. **Test Database**: Run `npx prisma studio` and verify schema
4. **Customize Branding**: Add your logo to `public/assets/`
5. **Deploy**: Deploy to Vercel or your preferred hosting platform

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env.local`
- Run `npx prisma generate` after schema changes

### Authentication Not Working
- Check Clerk API keys
- Verify middleware configuration
- Ensure public routes are correctly configured

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run lint`
- Verify all environment variables are set

## 📚 Documentation Links

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Shadcn/UI Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the documentation links
3. Check environment variables configuration
4. Verify all external services are properly configured

---

**Happy Coding! 🚀**
