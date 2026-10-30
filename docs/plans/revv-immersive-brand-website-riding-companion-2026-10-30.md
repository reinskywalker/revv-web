# REVV — Immersive Brand Website (Riding Companion)

## What we're building

A multi-page immersive web for the REVV brand, focused on **REVV – Riding Companion**
(the parent-brand context stays out of the site; no mention of other product lines).
Three routes, one dark "cockpit" design system, English copy:

```
src/routes/
  index.tsx        -> /        Immersive home: what REVV does + the aesthetic
  news.tsx         -> /news    Motorcycle news, empty state for now
  login.tsx        -> /login   Passwordless email login (UI only, phone look)
```

## Design system (from the Flutter theme `revv_colors.dart` + screenshots)

Rebuilt in `src/styles.css` as Tailwind v4 `@theme` tokens (dark-first, oklch):

- Background `#0A0D10`, surface `#141A20`, elevated `#1C242C`
- Accent red `#EE4B3E`, secondary text `#9FB3C8`, border `#2D3843`
- Success green `#34D399`, warning amber for "pending" chips
- Typography via Google Fonts `<link>` in `__root.tsx` head:
  - Display: **Archivo Black** style heavy grotesque, uppercase, tight tracking
    (matches "MOTORCYCLE NEWS", "EVERY ROAD HAS A STORY")
  - Body: **Inter**
  - Labels/eyebrows: **JetBrains Mono**, letter-spaced uppercase
    (matches "FRIENDLY NEIGHBORHOOD RIDING COMPANION", "01 / 03 · RIDE TOGETHER")
- Signature marks: the "REVV" wordmark with the red square period (pure CSS/JSX,
  no image needed), red progress bars, HUD-style bordered cards, breadcrumb
  eyebrows like "REVV / RIDER SYSTEM".

## Home (`/`) — immersive brand profile

Long-scroll dark experience:

1. **Hero** — giant REVV. wordmark animation, tagline "Friendly Neighborhood
   Riding Companion", "EVERY ROAD HAS A STORY." headline, onboarding-style
   pagination motif (01/03 · RIDE TOGETHER), CTA to /login, ambient rider imagery.
2. **What REVV does** — three pillars mirroring the onboarding story: Ride
   Together (crews, routes), Navigate (turn-by-turn HUD), Belong (community).
3. **Feature grid** (bento, HUD cards): Rider Feed, Communities & Events,
   Group Chat, Turn-by-Turn Navigation with Route History & Resume, Group Voice
   Intercom, Spotter (nearby riders), Photo Mode & Route Story studios,
   Digital Garage (machines + service log).
4. **Phone mockups section** — CSS-built phone frames showing recreated app
   screens (home feed, navigation HUD, profile/garage) to keep the immersive feel
   without needing real screenshots.
5. **News teaser** linking to /news, and a footer with the wordmark.

Generated imagery: 2–3 dark, cinematic riding photos (night street ride, bike
close-up, map/route aesthetic) saved to `src/assets` as regular imports.

## News (`/news`)

Styled empty state matching the app's news card language (red category chips,
"BY REVV GARAGE DESK" bylines): "MOTORCYCLE NEWS" header, then an empty-state
card — no stories yet, check back soon. Structured so real articles can be
wired to your backend later without redesign.

## Login (`/login`) — UI only, phone look

Recreates the Flutter screens as a centered phone-width column on desktop:

- **Welcome back** card with "Rider ID" chip, Sign In / Create Account tabs
- Email/username/phone field, "Send Verification Code" button
- **OTP screen**: 6-digit code input, "We'll email a 6-digit verification code
  valid for 10 minutes", resend timer, back navigation
- Simulated flow (no backend calls): loading → OTP sent → verifying → success
  state ("Signed in — the full rider experience is coming to web"). Any code
  accepted; form validation works client-side. Ready to swap for a real API later.

## Technical notes

- TanStack Start file routes above; replace the placeholder `index.tsx`.
- Each route gets its own `head()`: unique title/description/og (e.g.
  "REVV — Friendly Neighborhood Riding Companion" on home).
- Fonts loaded with `<link>` tags only (no remote `@import` in CSS).
- Semantic tokens only in components; no hardcoded colors.
- No real auth, no database, no backend calls in this phase.

## Out of scope (per your answers)

- Connecting login or news to your real backend (wiring hooks left in place)
- Google sign-in on web, any REVV–Gear content, GPS/map functionality
