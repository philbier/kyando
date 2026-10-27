# Kyandō

Mobile-first web app that coaches use to run a sports camp while it is happening. Built with Next.js, shadcn/ui, Tailwind CSS and next-intl. See [CLAUDE.md](CLAUDE.md) for the full project brief and [design/README.md](design/README.md) for the screen designs.

## Run the app locally

**Quick start** (if Node.js is already installed):

```bash
cd kyando
npm install
npm run dev
```

Then open <http://localhost:3000> in your browser. The steps below explain each part.

### 1. Install Node.js (once)

You need **Node.js 20.9 or newer** (it includes `npm`). Check with:

```bash
node -v
```

If the command isn't found, install the LTS version from <https://nodejs.org>, or on Windows:

```powershell
winget install OpenJS.NodeJS.LTS --scope user
```

Then open a new terminal so it picks up `node` and `npm`.

> **Windows PowerShell:** if `npm` fails with "running scripts is disabled on this system", use `npm.cmd` instead of `npm` (for example `npm.cmd run dev`), or run the commands in Git Bash or the Command Prompt.

### 2. Install the dependencies (once, and after pulling changes to `package.json`)

Open a terminal in the project folder (the folder that contains `package.json`). In VS Code: **Terminal → New Terminal** opens one there. Otherwise:

```bash
cd "path/to/github-personal/kyando"
```

Then install:

```bash
npm install
```

This downloads the libraries into `node_modules/` (takes a minute the first time).

### 3. Start the development server

```bash
npm run dev
```

Open <http://localhost:3000>. You land on the login page (`/de/login`). Pages reload automatically when you save a file.

To see the phone layout on a computer, open the browser's developer tools (F12) and turn on the device toolbar (Ctrl+Shift+M) with a width of 390 px.

**On your phone:** with phone and computer on the same Wi-Fi, open the "Network" address that `npm run dev` prints (for example `http://192.168.1.20:3000`).

To stop the server, press **Ctrl+C** in the terminal.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `node` or `npm` is not recognized | Node.js isn't installed, or the terminal was opened before installing it. Install it (step 1), then close **all** VS Code windows and reopen VS Code (a new terminal tab alone isn't enough, because VS Code terminals keep the old `PATH`). |
| "running scripts is disabled on this system" (PowerShell) | Use `npm.cmd` instead of `npm`, e.g. `npm.cmd run dev`. |
| "Port 3000 is in use" | Another server is still running. Stop it with Ctrl+C, or start on another port: `npm run dev -- -p 3001`. |
| Errors after pulling new code | Run `npm install` again; `package.json` may have new dependencies. |
| The page looks stale or broken after big changes | Stop the server, delete the `.next` folder, and run `npm run dev` again. |

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload on port 3000 |
| `npm run build` | Production build (also checks TypeScript) |
| `npm run start` | Serves the production build (run `npm run build` first) |
| `npm run lint` | Checks the code with ESLint |
| `npx shadcn@latest add <component>` | Adds a shadcn/ui component to `components/ui/` |

## Where things are

| Path | Contents |
| --- | --- |
| `app/[locale]/` | Pages. `[locale]` is the language in the URL: `/de/…`, `/fr/…`, `/it/…`, `/en/…` |
| `app/globals.css` | Theme (colors, radius, shadows, fonts) copied from `design/tokens.css` |
| `components/ui/` | shadcn/ui components |
| `messages/*.json` | All UI text. `de.json` is the source; missing keys in other languages fall back to German |
| `i18n/` | Language setup (next-intl) |
| `proxy.ts` | Runs before each request: adds the language to the URL (`/` → `/de`) |
| `design/` | Screen designs and design tokens |
