# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS + Tailwind over CDN, no build tooling. Deploy target: GitHub Pages. Backend: Google Sheets + Google Apps Script webhook (no server of its own).

## Users

Family members ranging from teenagers (~14) to grandparents (~85), registering for the "Berger Fest" family celebration on 2026-10-24. Two usage patterns are equally common and must both work well: one person filling in the whole family at once, and each person registering themselves individually. Device use is mixed and unpredictable per person — some fill it in on a computer, some on a smartphone. Some users (older family members) are not comfortable with fiddly UI conventions (small tap targets, iOS picker wheels, disappearing placeholder text).

## Product Purpose

Replace an ad-hoc email-based RSVP process with a single web form that lets any family member register attendance, meal choice, and allergies for themselves and/or others in their household. The real goal is not "a form" — it's stress-free catering planning: the host (site owner) must be able to see at any time how many portions of each menu line to order and which allergies need to be accounted for, with a clear, low-maintenance path to correct duplicate or erroneous entries by hand.

## Positioning

Not a generic RSVP tool — purpose-built for one specific family event, tuned so that a household of mixed ages and mixed devices can complete it without friction, and so that its output (a Google Sheet) is directly usable for catering headcounts without extra reconciliation work.

## Operating Context

- Distributed via a link sent by email to the family.
- One shared link works for everyone; no accounts, no login.
- Filled out on personal phones and computers, often in a rush or with grandparents needing to be walked through it.
- The host (site owner) reviews submissions in a Google Sheet, manually unchecking a "counts" checkbox to exclude duplicates — no automatic dedup.
- No app installation, no ongoing maintenance beyond editing a config file for text/dates/menus.

## Capabilities and Constraints

- Registration captures, per submission: one required email address (no separate sender-name field), and one or more persons, each with name, attendance status (attending / not attending), menu choice (only when attending), allergy free text (only when attending), plus one free-text note per submission.
- Attendance status has no pre-selected default.
- Choosing "not attending" hides that person's menu and allergy fields.
- Confirmation email sent to the submitting address after successful submission.
- No automatic duplicate detection or merging — all submissions are appended; the host resolves duplicates manually via a checkbox in the sheet.
- No server beyond Google Apps Script; must work around Apps Script's CORS/redirect behavior from a static page with no backend of its own.
- Menu options are named dishes (not abbreviations) — three lines: "Alles" (meat/fish), "Vegi mit Fisch", "Vegi ohne Fisch".
- Desktop/tablet layout renders as a table (one row per person); layout under 768px renders as flat, one-handed-usable cards. Same HTML, no duplicated markup.

## Brand Commitments

- Event name: "Berger Fest" — this is fixed and appears as-is.
- Event date: 2026-10-24 — fixed.
- No existing logo or visual identity; no other binding brand elements.
- Voice: warm, informal ("Du"-form), festive but not kitschy.

## Evidence on Hand

- `mockup.html`: static Tailwind draft with no logic — visual/structural reference only, not to be treated as an approved design direction (see known anti-patterns to move away from).
- `IMG_7185.jpg`: hand sketch of the intended desktop table layout (columns: Name, attendance, menu, allergies). Abbreviations in the sketch (A / V+F / V−F) were shorthand only — the real form uses full menu names.
- No guest list, testimonials, or other content assets on hand yet.

## Product Principles

1. Two equally valid entry modes (single self-registration, whole-family-by-proxy) must both feel like the primary path, not a workaround.
2. Device is unpredictable per person — desktop and mobile are equally first-class, not "mobile as an afterthought."
3. Senior-friendliness is a hard requirement, not a nice-to-have: large tap targets, visible labels, no fiddly native pickers, forgiving error recovery.
4. The host's catering math must stay trustworthy without automation risk — dedup and correction are manual, visible, reversible (checkbox), never silently automatic.
5. Zero maintenance burden after launch: all event-specific text, dates, and menu names live in one config file.

## Accessibility & Inclusion

Hard requirement: WCAG 2.1 AA, with these concrete floors carried forward into all UI work:
- Tap targets ≥ 44×44px (target 48px), ≥8px spacing between adjacent targets.
- Text contrast ≥ 4.5:1 body / ≥3:1 large text; controls and borders ≥ 3:1.
- Base font size ≥ 17px; form fields exactly 16px or larger (prevents iOS zoom-on-focus).
- Visible focus ring (≥3:1 contrast) on every interactive element.
- State never conveyed by color alone (selection shown via check, border weight, font weight too).
- Real semantic structure: `<fieldset>`/`<legend>` per person, real `<label for>`, `aria-live` for counters/errors, sensible tab order.
- Usable up to 200% text zoom without layout breakage.
- `prefers-reduced-motion` respected.
