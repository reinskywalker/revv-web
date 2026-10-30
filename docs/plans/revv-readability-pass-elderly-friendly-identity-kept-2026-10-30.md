# REVV — Readability Pass (elderly-friendly, identity kept)

## Direction (matches rydr-app.com)

Bookend structure: dark cinematic **hero** (and dark header/footer) for the
REVV identity, with all **content sections on bright surfaces with near-black
text** — the RYDR pattern. Text and buttons grow to elderly-comfortable sizes
everywhere, including the dark login page.

## Design system changes (`src/styles.css`)

- New semantic "panel" tokens (the light mode of the app's own theme):
  panel background `#F4F5F7`, panel card white `#FFFFFF`, panel foreground
  `#111418`, panel secondary text `#3F4A54` (darker than the app's for
  contrast), panel border `#CBD2D9`. Registered in `@theme inline` as
  `bg-panel`, `text-panel-*`, `border-panel`, etc.
- Existing dark tokens stay untouched — hero, header, footer, phones, login
  keep the cockpit look.
- Type scale up: body copy becomes 18px with taller line height; paragraphs
  that were `text-sm` become `text-lg`; card titles up one step.
- Buttons up: larger padding, `text-base`, min tap height ~52px; header nav
  links 14px; eyebrow labels 12px with brighter dark-theme color and darker
  light-theme color.
- New utilities: `panel` (light section shell), `panel-card` (white card with
  light border and soft shadow), plus updated `btn-primary`/`btn-ghost` sizes.

## Home (`/`)

- Hero: unchanged (dark, wordmark, onboarding pagination) — body copy inside
  hero brightens to near-white and grows.
- Everything after the hero sits on the light panel: "What REVV does" pillars,
  "Everything a rider needs" feature grid, phone showcase, news teaser.
  Cards become white with dark text; red accent chips/borders/icons stay.
- Image overlay cards (Navigation, Photo Mode) get a stronger solid-to-
  transparent gradient so their text stays readable, in near-black on light
  overlay panels.
- Red CTA band stays; its body copy enlarges.
- Footer returns to dark for the bookend, with brighter link text.

## News (`/news`)

- Dark header, light panel content: white category chips, dark heading,
  empty-state card on white with large dark text and the red wrench accent.

## Login (`/login`) — stays dark (phone look), boosted for eyes

- Headings and body text one size up; secondary text brightens (higher
  contrast gray), input fields grow to ~56px with larger text, tabs and
  buttons enlarge, OTP boxes grow, resend/hint text brightens.

## Unchanged

- Colors/red accent/wordmark/mono labels: identity preserved.
- Phone mockups, generated imagery, routes, login flow logic, news empty-state
  structure.
