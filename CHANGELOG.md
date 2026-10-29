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

### Changed

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
