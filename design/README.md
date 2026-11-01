# Design reference

These are the visual reference for Kyandō's screens, exported from the Claude Design canvas "Kyandō – Mobile Screens". Rules for using the design system are in `../CLAUDE.md` under "Design system".

| Path | Contents |
| --- | --- |
| `tokens.css` | Design tokens (shadcn/ui · Cyberpunk): light and dark theme, radius, shadows, fonts. Copy the values into `app/globals.css` unchanged. |
| `mobile/screens/*.png` | Phone screens, one screenshot each at 1.5× (390 px wide design). For every coach, including the Lagerleitung on a phone. |
| `mobile/source/*.dc.html` | Design source per phone screen, with exact German copy and which shadcn component is used where. Not runnable. |
| `mobile/Kyandō – Mobile Screens.pdf` / `.html` | Full canvas export of the phone screens. |
| `desktop/screens/*.png` | Laptop screens for the **Lagerleitung only**, one screenshot each at 1× (1440 × 960 px design). |
| `desktop/source/*.dc.html` | Design source per laptop screen. Not runnable. `DesktopLogin` imports `mobile/source/Login.dc.html`, and `DesktopWeekEdit` is `DesktopWeek` with `modus="bearbeiten"`. |

How to read a `.dc.html` source: `<x-import component-from-global-scope="ShadcnUI.Card">` means shadcn's `<Card>`, attributes are its props in kebab-case (`default-value` = `defaultValue`), and `<sc-for>` / `<sc-if>` are loops and conditions. The data for the calendars sits in the `renderVals()` script at the bottom of each file.

## Phone screens (`mobile/`)

| # | Screenshot | Source | Route | Notes |
| --- | --- | --- | --- | --- |
| 0 | `00-navigation.png` | `Sitemap.dc.html` | – | Navigation map and roles overview. |
| 1 | `01-login.png` | `Login.dc.html` | `/[locale]/login` | Language select at the top right works before login. No sign-up: "Noch keinen Zugang? Wende dich an die Lagerleitung." |
| 2 | `02-heute.png` | `Main.dc.html` | `/[locale]/heute` | **Home screen.** Sections: Jetzt (large card, whole card links to the session) → Als Nächstes (with "in X Min.") → Später heute → Erledigt (faded, with check icons) → "Zuletzt aktualisiert um …". Each section only shows when it has sessions. |
| 3 | `03-kalender-tag.png` | `CalendarDay.dc.html` | `/[locale]/kalender?ansicht=tag` | Tabs Tag / Woche. Day picker Mo–Fr (ToggleGroup, today preselected). Group filter (Select). Past time slots fold into "Frühere Einheiten anzeigen (n)". Sessions are grouped by time slot; parallel sessions are listed one under another. The current slot gets a "Jetzt" badge, and the logged-in coach's sessions get a "Meine" badge. |
| 4 | `04-kalender-woche.png` | `CalendarWeek.dc.html` (imports `CalendarDay.dc.html` with `ansicht="woche"`) | `/[locale]/kalender?ansicht=woche` | Mon–Fri grid, 08–18 h, for **one** lens at a time ("Meine Einheiten" or one group), because all groups at once is unreadable on a phone. Blocks show `short_name` and start time; the coach's own sessions get a 2px inset ring in `foreground`. A primary line marks "now" in today's column. A separate row holds the evening program at 19:30. Legend underneath. |
| 5 | `05-einheit-details.png` | `SessionDetail.dc.html` | `/[locale]/einheit/[id]` | Time, location (with a "Karte" button that opens maps), group, coaches (with a call button), notes and "Geändert von …". The bottom bar with "Einheit bearbeiten" shows **only for Lagerleitung**. |
| 6 | `06-einheit-bearbeiten.png` | `EditSession.dc.html` | `/[locale]/einheit/[id]/bearbeiten` | **Lagerleitung only.** Fields: Aktivität, Kurzname (≤ 10 characters, for the week view), Kategorie, Tag, Beginn/Ende, Ort, Gruppe, Coaches (checkboxes), Hinweise. An alert warns when a selected coach is already booked at the same time. "Einheit löschen" is destructive and needs a confirm dialog (AlertDialog). "Änderungen speichern" sits in a fixed bottom bar. |
| 7 | `07-profil.png` | `Profile.dc.html` | `/[locale]/profil` | Name, email, role badge. Language as a RadioGroup (Deutsch, Français, Italiano, English) that applies immediately. Camp info with the Lagerleitung contact; the emergency number is a placeholder for now. "Abmelden" button. |

## Laptop screens for the Lagerleitung (`desktop/`)

On a laptop, a user with the role `head_organizer` gets a different shell. Everyone else, and the Lagerleitung on a phone, keeps the phone layout. **What coaches see on a laptop is not decided yet.**

- **Sidebar instead of bottom navigation:** shadcn `Sidebar`, sticky, full height. From top to bottom:
  - the camp switcher ("Kyandō · Herbstlager 2026" with an up/down chevron);
  - group "Lager": Kalender, Profil;
  - group "Verwaltung": Coaches, Gruppen, Orte. These are **placeholders**, with no screens designed yet;
  - footer: avatar, name, role, and an icon button "Abmelden".
- **After login**, the Lagerleitung lands on the full-screen Wochenplan, not on Heute.
- Only these screens have a laptop layout. Heute and the day view were **not** redesigned for the laptop.

| # | Screenshot | Source | Route | Notes |
| --- | --- | --- | --- | --- |
| 1 | `01-login.png` | `DesktopLogin.dc.html` | `/[locale]/login` | Identical to the phone login, centered on the page. |
| 2 | `02-wochenplan.png` | `DesktopWeek.dc.html` | `/[locale]/kalender?ansicht=woche` | **Start page of the Lagerleitung.** Full screen next to the sidebar. Mo–Fr, 08:00–21:30 in one grid, including the evening. **All groups at once:** each day column is split into four fixed lanes (Adler · Füchse · Luchse · Bären, labelled under the date). A session for "Alle Gruppen" spans the whole day column and shows its full title and time. A group session shows `short_name` and its start time. Legend above the grid, a primary "now" line in today's column, today's date in a primary circle. Clicking a session opens its details. Top right: **"Bearbeiten"** (primary). |
| 3 | `03-wochenplan-bearbeiten.png` | `DesktopWeekEdit.dc.html` | same route, edit mode | After "Bearbeiten", the button is replaced by **"Abbrechen"** (outline) and **"Speichern"** (primary). A bar explains the mode and counts unsaved changes. Faint 15-minute lines show the snap grid. Every block gets a grip at its bottom edge. The screenshot shows three actions frozen mid-way: **move** (lifted block with a ring and a time label, dashed outline where it started), **resize** (dragging the bottom edge, with the new time and duration), and **draw new** (dashed primary box in an empty slot; releasing opens "Einheit bearbeiten" with that day, time and group). Changed blocks get a primary dot. Nothing is stored until "Speichern"; "Abbrechen" discards all changes. Clicking a block does not open details in edit mode. |
| 4 | `04-einheit-details.png` | `DesktopDetails.dc.html` | `/[locale]/einheit/[id]` | Breadcrumb (Wochenplan › day › title) and "Bearbeiten" at the top. Category, title, "Jetzt" badge with time left, "Zuletzt geändert von …". Three cards in a row: Zeit, Ort (with "Karte"), Gruppe. Below, two columns: Hinweise and "Gleichzeitig im Plan" (the other groups' sessions in the same slot, each linking to its details) on the left, Coaches with call buttons on the right. |
| 5 | `05-einheit-bearbeiten.png` | `DesktopEdit.dc.html` | `/[locale]/einheit/[id]/bearbeiten` | Breadcrumb and title, "Abbrechen" and "Speichern" at the top right (not in a bottom bar). Overlap alert. Left: card "Einheit" (Aktivität, Kurzname + Kategorie side by side, Hinweise) and card "Zeit und Ort" (Tag, Beginn, Ende in one row; Ort, Gruppe in one row). Right: card "Coaches" with a **"frei" / "belegt"** badge next to each coach, and card "Einheit löschen" (destructive, with confirm dialog). |
| 6 | `06-profil.png` | `DesktopProfile.dc.html` | `/[locale]/profil` | Max. 960 px wide. Cards "Konto" and camp info side by side, then "Sprache" as four selectable cards in a row (the selected one has a primary border), then "Abmelden". |

Sample data is the same made-up camp as on the phone. The logged-in user on the laptop screens is **Sandra Meier (Lagerleitung)**.

## Don't copy these export glitches

Phone screens:

- The Tag/Woche **Tabs** and the **filter Select** are meant to be **full width**. They render narrower in the screenshots.
- The week grid's evening label "19:30" must stay on one line.
- The "Jetzt" card title is meant to be larger (24px, `text-2xl`) than it looks in `02-heute.png`.
- Tall screenshots show the whole scrollable page. On a real phone, the bottom navigation and the bottom action bars stay fixed while the content scrolls behind them.

Laptop screens:

- The laptop screenshots were rendered **without the Outfit font**, so they show a fallback sans. The app uses Outfit and Fira Code, as on the phone.
- Narrow lane blocks break some words badly ("Schwi / mmen"). They should break at the hyphenation point instead ("Schwim- / men"), or use a shorter `short_name`.
- The **Select** fields in "Einheit bearbeiten" (Kategorie, Tag, Ort, Gruppe) are meant to be **full width** of their column.
- The time inputs show "10:45 AM" because of the browser that made the screenshot. The app uses the 24-hour clock ("10:45").
- On the real page, the sidebar stays fixed while the main area scrolls.
