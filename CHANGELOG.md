# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- "Meine Einheiten heute" screen at `/[locale]/heute`, built from `design/screens/02-heute.png`: header with avatar, day and camp summary, "Jetzt" card, "Als Nächstes", "Später heute", "Erledigt" and "Zuletzt aktualisiert um …". Each section only shows when it has sessions.
- Bottom navigation (Heute · Kalender · Profil) in the logged-in layout `app/[locale]/(app)/layout.tsx`.
- Dummy data in `data/*.json`, one file per planned database table, read through `lib/data.ts`. `data/demo.json` fixes the current time (Tuesday, 13 October 2026, 11:20) and the logged-in coach (Lena Brunner).
- Profil screen at `/[locale]/profil`, built from `design/screens/07-profil.png`: name, email and job title, language as radio buttons that switch the app right away, camp info with the Lagerleitung and an emergency-number placeholder, and "Abmelden" (for now it just goes back to the login screen).
- Data fields `profiles.job_title`, `camps.venue` and `camps.emergency_phone`.
- shadcn components `avatar`, `badge`, `item` and `radio-group`.
- Translations for the new screen in `de`, `fr`, `it` and `en`.
- Kalender screen at `/[locale]/kalender`, built from `design/screens/03-kalender-tag.png` and `04-kalender-woche.png`. View, day and filter are kept in the URL (`?ansicht=tag|woche&tag=…&filter=…`).
  - Tag: day picker for the camp days, filter (Alle Gruppen, Nur meine Einheiten, one group), sessions grouped by time slot with "Jetzt" and "Meine" badges. On today, finished slots fold into "Frühere Einheiten anzeigen (n)".
  - Woche: 08–18 h grid for "Meine Einheiten" or one group, with dashed half-hour lines, a "now" line and a separate evening row. Each session shows its short name and times ("10:00-11:00"). Overlapping sessions are shown side by side.
  - "Zuletzt aktualisiert um …" at the bottom, for the sessions on screen. Changes from an earlier day also show the date.
  - "Neue Einheit" button, shown only to the Lagerleitung.
  - Category colors and legend in `components/category.tsx`.
- Seed sessions for the whole camp week (Monday to Friday) and three more locations.
- shadcn components `tabs` and `toggle-group`.
- Einheit details at `/[locale]/einheit/[id]`, built from `design/screens/05-einheit-details.png`: category, title, "Jetzt" badge with time left (or "beginnt in …" later today), time and length, date, location with a "Karte" button (opens Google Maps), group, coaches with a call button, Hinweise and "Geändert von …". The back button returns to the previous screen, so the Kalender keeps its day and filter. "Einheit bearbeiten" in a fixed bottom bar, shown only to the Lagerleitung.
- Einheit bearbeiten at `/[locale]/einheit/[id]/bearbeiten` and Neue Einheit at `/[locale]/einheit/neu`, built from `design/screens/06-einheit-bearbeiten.png`, for the Lagerleitung only (coaches are sent back to the details or the Kalender):
  - Fields Aktivität, Kurzname (max. 10 characters), Kategorie, Tag, Beginn/Ende, Ort, Gruppe (including "Alle Gruppen" and "Alle Coaches"), Coaches and Hinweise, with translated error messages.
  - "Überschneidung" alert while editing, when a selected coach is already in another session at the same time.
  - "Einheit löschen" with a confirm dialog.
  - The Server Actions `saveSessionAction` and `deleteSessionAction` check the role and every value. For now, changes are kept in the server's memory and are lost when the server restarts.
- Data field `profiles.phone`.
- shadcn components `alert`, `alert-dialog`, `checkbox` and `textarea`.
- Laptop designs for the Lagerleitung in `design/desktop/` (screenshots and design sources): sticky sidebar, full-screen Wochenplan with an edit mode, Einheit details, Einheit bearbeiten and Profil. `design/README.md` and `CLAUDE.md` now point to `design/mobile/` and `design/desktop/`.
- Updated laptop designs: the Wochenplan shows one group at a time, picked in a dropdown, instead of one lane per group. A new **Gantt** view (`07-gantt.png`, `08-gantt-bearbeiten.png`, sidebar entry "Gantt") shows all groups as rows and the week along the top, with the same edit mode. The laptop sample data now has 10 groups.
- Laptop design for Heute (`design/desktop/screens/01-heute.png`), now the Lagerleitung's start page and first sidebar entry: their own sessions on the left and "Im Lager gerade" (what every group is doing right now) on the right.
- Laptop layout for the Lagerleitung (Tailwind `lg` and wider), built from `design/desktop/screens/02-wochenplan.png`, `03-wochenplan-bearbeiten.png`, `07-gantt.png` and `08-gantt-bearbeiten.png`:
  - Sticky sidebar instead of the bottom navigation: Kyandō with the camp name, Heute, Kalender, Gantt and Profil, Coaches, Gruppen and Orte (disabled until they have screens), and the user with "Abmelden".
  - Full-screen Wochenplan at `/[locale]/kalender?ansicht=woche&filter=…`: one group or "Meine Einheiten" at a time, picked in a dropdown (the same `filter` as on the phone). Mo–Fr as five wide columns, 08:00–21:30 including the evening, blocks with title, time and location ("· Alle Gruppen" for shared sessions), legend, "now" line and today's date in primary. Clicking a session opens its details.
  - Gantt at `/[locale]/gantt`: all groups at once, one row per group plus "Alle Gruppen" on top, Mo–Fr side by side along the top. It scrolls sideways, opens at today, keeps the group names and the header in place, and has a zoom dropdown (50–200 %). Coaches are sent to the Kalender.
  - Edit mode ("Bearbeiten"), the same in both views: drag a session to another day or time (in the Gantt also into another group's row), drag its edge to change the length (Wochenplan: bottom, Gantt: right), or click or drag in an empty slot to open "Neue Einheit" with day, time and group filled in. Everything snaps to 15 minutes. Arrow keys work too. Changed sessions get a primary dot, and a bar explains the mode and counts the unsaved changes.
  - "Speichern" stores all changes at once through the Server Action `savePlanChangesAction`. "Abbrechen", or leaving the page with unsaved changes, asks "Änderungen verwerfen?" first.
  - The "Bearbeiten" button sits in the toolbar above the plan, next to the dropdowns.
  - Heute at `/[locale]/heute`, built from `design/desktop/screens/01-heute.png`: the same sections as on the phone on the left ("Jetzt" card with location, group and co-coach side by side, "Später heute" and "Erledigt" side by side). On the right, the card "Im Lager gerade" (`heute/camp-now-card.tsx`): one row per group with what it is doing right now (its own session, or else one for all groups), the user's own row marked "Meine", an "Im Gantt" button and "Danach: …" with the next session for the whole camp. Only the Lagerleitung sees this card, and only on a laptop.
  - Einheit details at `/[locale]/einheit/[id]`, built from `design/desktop/screens/04-einheit-details.png` (`einheit/[id]/session-details-wide.tsx`): breadcrumb (Wochenplan › day › title) and "Bearbeiten" on top, category, title, "Jetzt" with time left and "Zuletzt geändert von …", three cards Zeit, Ort (with "Karte") and Gruppe, then Hinweise and "Gleichzeitig im Plan" (the first three of the other groups' sessions at the same time, plus "Alle im Gantt") next to the Coaches with call buttons.
  - Einheit bearbeiten and Neue Einheit, built from `design/desktop/screens/05-einheit-bearbeiten.png`: breadcrumb and title with "Abbrechen" and "Speichern" on top instead of the bottom bar, cards "Einheit" and "Zeit und Ort" on the left, "Coaches" and "Einheit löschen" on the right. It's the same form as on the phone, arranged with `lg:` classes.
  - Each coach in the form shows "frei" or "belegt" for the chosen time, on the phone too. "Hinweise" moved up into the first section, also on the phone.
  - Profil, built from `design/desktop/screens/06-profil.png`: max. 960 px wide, "Konto" and the camp side by side, "Sprache" as four cards in a row (the selected one with a primary border), then "Abmelden". The camp card now also lists the number of groups and coaches, on the phone too.
  - The Einheit screens now have the sidebar as well ("Kalender" is highlighted there). The sidebar, bottom navigation and "Zuletzt aktualisiert" live in `components/app-shell.tsx`, shared by both layouts.
  - shadcn component `breadcrumb`.
  - "Zuletzt aktualisiert um …" stays in the bottom right corner on every laptop screen (Heute, Wochenplan, Gantt, Profil and the Einheit screens). It shows the most recent change to any session of the camp (`components/last-updated.tsx`). The phone screens keep their own label at the bottom of the page.
- `/[locale]/einheit/neu` accepts `?tag=…&beginn=…&ende=…&gruppe=…` to fill in a new session (without `gruppe` it's for all groups).
- Six more demo groups (Wölfe, Steinböcke, Gämsen, Murmeltiere, Biber, Eulen, 10 in total, like the laptop designs), with sessions copied from the first four groups.
- shadcn component `sidebar` (with `sheet`, `skeleton`, `tooltip` and `hooks/use-mobile.ts`).

### Changed

- Pages set their own width now (`max-w-md` for the phone screens) instead of the logged-in layout, so the Wochenplan can use the whole screen.
- The phone week view, the Wochenplan and the Gantt share one helper for showing overlapping sessions side by side. The code shared by Wochenplan and Gantt lives in `app/[locale]/(app)/_plan/` (the underscore keeps the folder out of the URLs).

- For testing, "Anmelden" no longer checks credentials: it always goes to the Heute screen in the current language.
- changed login form an removed 'forgot password'

## [0.1.0] - 2026-10-11

First version: project setup and the login screen.

### Added

- Next.js 16 project (App Router, TypeScript, React 19, Turbopack) with the scripts `dev`, `build`, `start` and `lint`.
- shadcn/ui (`new-york` style, Radix, lucide-react) with the components `button`, `card`, `field`, `input`, `label`, `select` and `separator` in `components/ui/`, and the `cn()` helper in `lib/utils.ts`.
- Theme in `app/globals.css`: the tweakcn "Cyberpunk" tokens from `design/tokens.css` for light and dark mode, exposed to Tailwind CSS v4 with `@theme inline`, and the `.type-*` typography presets.
- Fonts Outfit (sans) and Fira Code (mono), loaded with `next/font/google`.
- `hyphens: auto` on `<html>`, so long German words wrap instead of overflowing.
- Translations with next-intl for `de` (default), `fr`, `it` and `en`, with routes under `app/[locale]/`. Missing keys fall back to German. All UI text is in `messages/*.json`.
- `proxy.ts` adds the language to the URL (for example `/` → `/de`).
- Opening the app (`/` or `/[locale]`) redirects to the login screen.
- Login screen at `/[locale]/login`, built from `design/screens/01-login.png`:
  - Language switcher (remembered in a cookie).
  - Brand block with logo, name and tagline.
  - Form with email, password, a "Passwort vergessen?" link and the "Anmelden" button. Inputs are 44px tall and use 16px text.
  - Note for people without an account.
- The `signIn` Server Action (`app/[locale]/login/actions.ts`). For now it always fails, and the form shows a general error message while keeping the email that was entered.
- `README.md` explaining how to install Node.js, install the dependencies, start the app locally and fix common problems.
