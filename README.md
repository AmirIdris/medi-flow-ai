# MediaFlow AI

A powerful video downloader and AI summarization platform built with Next.js 14.

## Features

- 🎥 Multi-platform video downloader (YouTube, TikTok, Instagram, etc.)
- 🤖 AI-powered video transcription and summarization
- 💳 Payment integration with Stripe and Chapa
- 🔐 Secure authentication with Clerk
- 📊 User dashboard with usage analytics
- 🎨 Modern UI with Tailwind CSS and Shadcn/UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Auth**: Clerk
- **Database**: Prisma ORM
- **Caching**: Upstash Redis
- **Payments**: Stripe + Chapa
- **AI**: OpenAI API
- **API**: RapidAPI for video extraction

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.local.example` to `.env.local` and fill in your environment variables

4. Initialize Shadcn/UI:
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input card
   ```

5. Generate Prisma client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
mediaflow-ai/
├── app/                 # Next.js App Router
├── actions/             # Server Actions
├── components/          # React Components
├── hooks/               # Custom React Hooks
├── lib/                 # Configuration & Clients
├── services/            # Business Logic Layer
├── types/               # TypeScript Types
├── styles/              # Global Styles
├── public/              # Static Assets
└── prisma/              # Database Schema
```

## License

MIT
