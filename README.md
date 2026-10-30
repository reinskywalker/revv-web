# REVV- Web

Official web portal and motorcycle news hub for **REVV – Riding Companion**, hosted at `https://revv.asteralabs.digital`.

## Features

- **Immersive Brand Experience**: Dark cockpit design system showcasing REVV features — Turn-by-Turn Navigation HUD, Rider Feed, Communities & Events, Group Chat, Intercom, and Digital Garage.
- **Motorcycle News Feed**: Connected directly to the REVV Backend (`/api/v1/news`) featuring garage desk articles, maintenance tips, safety guides, and riding craft stories.
- **Passwordless Rider Login**: Direct OTP login integration with the REVV backend authentication service. Note: Registration is exclusively reserved for the mobile app; web is sign-in only.
- **SEO & AI Crawler Optimized**: Comprehensive metadata, OpenGraph tags, JSON-LD schemas, robots.txt bot rules (including GPTBot, ClaudeBot, PerplexityBot, Google-Extended), XML sitemap, and `llms.txt`.
- **Vercel Ready**: Full native Nitro/Vercel SSR bundle generation targeting `revv.asteralabs.digital`.

## Tech Stack

- **Framework**: TanStack Start + TanStack React Router
- **Styling**: Tailwind CSS v4 with custom cockpit & panel design tokens
- **Data Fetching**: TanStack React Query
- **Deployment**: Nitro with Vercel Serverless Function & Static Assets preset

## Development

```sh
cd revv-web
npm install
npm run dev
```

## Production Build & Vercel Hosting

```sh
cd revv-web
npm run build
```

This compiles client assets into `.vercel/output/static` and SSR handlers into `.vercel/output/functions/__server.func` for automatic zero-config deployment on Vercel.
