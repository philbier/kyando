# Design reference

These are the visual reference for Kyandō's prototype screens, exported from the Claude Design canvas "Kyandō – Mobile Screens". Rules for using the design system are in `../CLAUDE.md` under "Design system".

| File | Contents |
| --- | --- |
| `tokens.css` | Design tokens (shadcn/ui · Cyberpunk): light and dark theme, radius, shadows, fonts. Copy the values into `app/globals.css` unchanged. |
| `screens/*.png` | One screenshot per screen at 1.5× (390 px wide design). |
| `source/*.dc.html` | Design source per screen, with exact German copy and which shadcn component is used where. Not runnable. |
| `Kyandō – Mobile Screens.pdf` / `.html` | The full canvas export. |

## Screens

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

The design sample data is a made-up camp: Herbstlager 2026, 12–16 October; groups Adler, Füchse, Luchse and Bären; logged-in coach Lena Brunner (Judo-Coach). Use the same data as seed data for development.

## Don't copy these export glitches

- The Tag/Woche **Tabs** and the **filter Select** are meant to be **full width**. They render narrower in the screenshots.
- The week grid's evening label "19:30" must stay on one line.
- The "Jetzt" card title is meant to be larger (24px, `text-2xl`) than it looks in `02-heute.png`.
- Tall screenshots show the whole scrollable page. On a real phone, the bottom navigation and the bottom action bars stay fixed while the content scrolls behind them.
