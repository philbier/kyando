# Kyandō

Mobile-first web app that coaches use to run a recreational sports camp **while it is happening** (usually one week). It is not for registration or booking.
The name joins *kyanpu* ("camp") and *dō* (道, "the way", as in judo).

- Users: about 20 coaches. They are the only users. Campers have no accounts.
- Main device: phones, used quickly between sessions. Reliable Wi-Fi.
- Reused every year, so nothing camp-specific may be hard-coded.

## Working with the owner

- The owner knows **Python and SQL well** and **a little JavaScript**. When you make a React or Next.js choice that isn't obvious (server vs. client component, a Server Action, caching), explain it in one or two sentences and comment the code
- Prefer simple, readable code over clever abstractions. Use as few libraries as possible, and ask before adding a new dependency.
- Work in small steps that can be checked in the browser.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js** (App Router), **TypeScript**, React |
| UI components | **shadcn/ui** (real components, `new-york` style), added with `npx shadcn@latest add <component>` into `components/ui/`. Built on Radix. |
| Styling | **Tailwind CSS** (v4), theme from `design/tokens.css` |
| Icons | **lucide-react** |
| Database & auth | **Supabase**: Postgres, Auth (email + password), Row-Level Security (RLS). Schema changes are SQL files in `supabase/migrations/`. |
| Translations | **next-intl** |
| Hosting | Vercel (free tier) + Supabase (free tier) |
| Package manager | npm |

Not used, on purpose: no global state library (Redux, Zustand), no separate API server, no ORM. Use `supabase-js` and plain SQL in migrations.

## Language: German first

**Rule: German first, everything else through translation files.**

- Every user-visible string lives in `messages/<locale>.json`. **Never hard-code UI copy in components**, including button labels, empty states, errors and `aria-label`s.
- `messages/de.json` is the source of truth. Write the German copy first, then add the same key to `fr.json`, `it.json` and `en.json`. Missing translations fall back to German.
- Locales: `de` (default), `fr`, `it`, `en`. Routes live under `app/[locale]/…`.
- The language switcher is on the login screen and in Profil. The choice is saved in the user's profile (and a cookie before login).
- Format dates and times with next-intl formatters: 24-hour clock, in the camp's time zone. Don't hand-build date strings.
- Plan for **long German words**:
  - Never truncate session titles or locations. Let them wrap.
  - Set `lang` on `<html>` and use `hyphens: auto`.
  - Test with words like "Orientierungslauf", "Dreifachturnhalle" and "Abschlussfeier mit Eltern".
  - The week view shows a session's `short_name` (max. 10 characters) instead of its full title.
- Tone: address the user as "du", use sentence case, keep it short. No emoji in the UI.

## Roles and rights

| Role (DB value) | UI label (de) | Rights |
| --- | --- | --- |
| `head_organizer` | Lagerleitung | Everything coaches can do, **plus**: create, edit and delete sessions; assign coaches to sessions; manage groups, locations and camps; invite coaches and set their role. |
| `coach` | Coach | **View only**: the full schedule (day and week). Sees their own assigned sessions on "Heute". Can change their own profile and language. |

- **The database enforces permissions with RLS.** Only `head_organizer` may insert, update or delete `sessions`, `session_coaches`, `groups`, `locations` and `camps`. Every logged-in coach may read them.
- Server Actions also check the role before writing, and the UI hides editor controls for non-organizers. That hiding is convenience only, not security.
- No self-registration: the Lagerleitung invites coaches by email.

## Design system

The theme is **shadcn/ui with the tweakcn "Cyberpunk" preset**. Its tokens are in `design/tokens.css`. Keep the values exactly as they are.

- **Setup:** copy the variables from `design/tokens.css` into `app/globals.css` in place of shadcn's default theme block, and expose them to Tailwind with `@theme inline`, the same way shadcn's generated `globals.css` does. Rename the dark selector `[data-theme="dark"]` to `.dark`, which is what shadcn expects.
- **Fonts:** load **Outfit** (sans, all UI) and **Fira Code** (mono, only for times in the week grid, IDs and code) with `next/font/google`.
- **Color rules:**
  - `primary` (magenta) is the one loud thing on a screen: the single main button, and the current or selected state (the "Jetzt" badge, the active tab in the bottom navigation, today's date). Use one primary button per view; everything else is `outline`, `secondary` or `ghost`.
  - `accent` (mint) is for hover and highlight only. Never use it as a resting fill or as text on a light background.
  - `destructive` is only for irreversible actions and errors, always with a word or icon.
  - In light mode `muted-foreground` equals `foreground`. To de-emphasize, use size, weight or opacity, not color.
- **Activity categories** always pair a color with a text label (legend or letter):
  - Judo: `chart-2`, white text
  - Polysport: `chart-3`, dark text
  - Gemeinsam (shared activities): `muted` plus a border
  - Ausflug & Abend (outings and evenings): `chart-5`, dark text
- **Shape:** radius `0.5rem`. Cards use `rounded-xl`, buttons and inputs `rounded-md`. Shadows stay soft and black, never colored glows.
- **Icons:** Lucide, 2px stroke, `size-4` inside controls. Icon-only buttons need an `aria-label` (translated).
- **Mobile-first:** design width 390px, must work at 360px, no horizontal page scroll. Touch targets are at least 44px tall, even where shadcn's default control height is 36px. Inputs use 16px text so iOS doesn't zoom.
- Copy style follows shadcn's examples: short, plain, sentence case. Buttons are verbs, labels are nouns.

## Visual reference

The screens were designed on a Claude Design canvas. Treat them as the visual target for layout, hierarchy and German copy. **`design/README.md` maps each screen to its route and lists the details the images don't show.**

- `design/screens/*.png`: one screenshot per screen. Open the matching image before building a screen.
- `design/source/*.dc.html`: the design source of each screen. Read it for exact German copy and for which shadcn component is used where. It is **not runnable**: `<x-import component-from-global-scope="ShadcnUI.Card">` means shadcn's `<Card>`, and `<sc-for>` / `<sc-if>` are loops and conditions.
- `design/Kyandō – Mobile Screens.pdf`: all screens in one file.

## App structure (planned routes)

| Route | Screen |
| --- | --- |
| `/[locale]/login` | Anmelden |
| `/[locale]/heute` | **Meine Einheiten heute**: the home screen (`/` redirects here after login) |
| `/[locale]/kalender?ansicht=tag\|woche&tag=…&filter=…` | Kalender: day and week views |
| `/[locale]/einheit/[id]` | Einheit details |
| `/[locale]/einheit/[id]/bearbeiten`, `/[locale]/einheit/neu` | Edit or create a session (Lagerleitung only) |
| `/[locale]/profil` | Profil, Sprache, Abmelden |

The bottom navigation (Heute · Kalender · Profil) lives once in the logged-in layout.

## Data model (first draft)

- `camps`: id, name, starts_on, ends_on, timezone (default `Europe/Berlin`), venue, emergency_phone, is_active
- `profiles`: id (references `auth.users`), full_name, email, role, job_title (e.g. "Judo-Coach", optional), locale
- `groups`: id, camp_id, name, age_range, size
- `locations`: id, camp_id, name, address_hint
- `sessions`: id, camp_id, title, short_name (≤ 10 chars), category (`judo` | `polysport` | `gemeinsam` | `ausflug_abend`), starts_at, ends_at (`timestamptz`), location_id, group_id (null means all groups), coaches_only (shown as "Alle Coaches", e.g. the morning meeting), notes, updated_by, updated_at
- `session_coaches`: session_id, coach_id

"Meine Einheiten heute" is: today's sessions (in the camp's time zone) joined to `session_coaches` for the logged-in coach, ordered by `starts_at`.

## Conventions

- **Server Components by default.** Add `"use client"` only where a component needs state or event handlers, such as tabs, filters or the day picker.
- **Writes go through Server Actions**, followed by `revalidatePath(...)` for the affected pages.
- Supabase clients live in `lib/supabase/` (one for the server, one for the browser). Never expose the service-role key. Only `NEXT_PUBLIC_*` variables reach the browser.
- Store times as `timestamptz` (UTC) and always display them in the camp's time zone.
- Code, database names and comments are in English. UI copy is German, through the translation files.
- Commands (update once the project is scaffolded): `npm run dev`, `npm run build`, `npm run lint`.

## Scope

- **Prototype v1:** the designed screens: login, Heute, Kalender (day and week), session details, edit or create a session, Profil with language switcher.
- **Later** (see `prompt.text` and `ui-prompt_2.txt`): Excel import of the schedule, notifying coaches of schedule changes, shared materials (file uploads), switching camps by year.
- **Out of scope:** payments, booking, camper accounts, native app.
