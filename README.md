# REVV- Web

Official web portal, closed beta registration hub, and motorcycle news portal for **REVV – Riding Companion**, hosted at `https://revv.asteralabs.digital`.

## Features

- **Immersive Brand Experience**: Dark cockpit design system showcasing REVV features — Turn-by-Turn Navigation HUD, Rider Feed, Communities & Events, Group Chat, Intercom, and Digital Garage.
- **Closed Beta Pre-Registration (`/register`)**: Allows riders to apply for Closed Beta access (`POST /api/v1/registrations`) with Play Store email, riding base, and primary machine details.
- **Passwordless Rider Login & Role-Based Portal (`/login`)**:
  - **Rider Portal**: Manage Rider Profile & Status, Digital Garage machines (synced with the mobile app), and Rider Feed posts.
  - **Moderator Capabilities**: Content moderation on Rider Feed posts and comments.
  - **Administrator Superuser Console (`role === 'administrator'`)**: Full platform metrics dashboard, Closed Beta registration roster management, User RBAC & soft-delete management, Master Data CRUD (Brands, Motorcycles, Components), and News CMS.
- **Motorcycle News Feed (`/news`)**: Connected directly to the REVV Backend (`/api/v1/news`) featuring garage desk articles, maintenance tips, safety guides, and riding craft stories.
- **SEO & AI Crawler Optimized**: Comprehensive metadata, OpenGraph tags, JSON-LD schemas, robots.txt bot rules, XML sitemap, and `llms.txt`.
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
