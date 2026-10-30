# AGENTS.md - REVV- Web


## Project rules

- The site uses the RYDR-style bookend pattern: dark cockpit hero/header/
  footer for identity, all content sections on bright "panel" surfaces with
  near-black text for elderly-friendly readability. All theme values (dark
  palette, light panel tokens, Archivo/Inter/JetBrains Mono fonts, HUD
  utilities like `display-heading`/`eyebrow`/`hud-card`/`panel-card`) live in
  `src/styles.css` as Tailwind v4 tokens — never hardcode colors or fonts in
  components. Text and buttons stay at the enlarged, elderly-comfortable
  sizes; do not shrink them back.
- `/login` is deliberately UI-only (simulated OTP, any 6 digits verify); the
  real OTP backend calls replace the two `setTimeout` simulations in
  `src/routes/login.tsx` when the user's backend is wired. `/news` renders an
  empty state; real articles replace the empty `articles` array there.
- Never mention other REVV product lines (e.g. REVV Gear) anywhere on the web.
