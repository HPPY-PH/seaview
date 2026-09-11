# Contributing to Seaview

A guide for collaborators. Read the **Safety rules** section before your first commit — `main` deploys to production automatically.

---

## 1. One-time setup

### Accept the repo invite

Check your email or open [github.com/HPPY-PH/seaview](https://github.com/HPPY-PH/seaview) and accept. Nothing below works until you do.

### Install Node.js

You need **Node 20.19+ or 22.12+** (Vite's minimum). Check yours:

```bash
node --version
```

If it's older, install from [nodejs.org](https://nodejs.org).

### Clone and install

```bash
git clone https://github.com/HPPY-PH/seaview.git
cd seaview
npm install
```

`npm install` is required — `node_modules/` is not in the repo.

### Run it

```bash
npm run dev
```

Opens at `http://localhost:5173`.

**No `.env` file, no API keys, no backend setup.** The app currently runs on a mock backend, so it works immediately after install.

---

## 2. Safety rules

These exist because **every push to `main` deploys straight to the live site** via Webflow Cloud. There is no staging step.

| Rule | Why |
| --- | --- |
| Never commit directly to `main` | It deploys instantly. A mistake is live before you notice. |
| Always branch | Lets someone review before it ships. |
| Always `git pull` before starting | Prevents most merge conflicts. |
| Always `npm run build` before pushing | If the build fails locally, the deploy fails too. |
| Never commit `.env`, keys, or tokens | They're gitignored — keep it that way. |

---

## 3. The safe workflow

### Step 1 — Start from current `main`

```bash
git checkout main
git pull
```

Skipping this is the number one cause of conflicts.

### Step 2 — Create a branch

```bash
git checkout -b short-description-of-change
```

Good branch names: `fix-invoice-total`, `add-guest-export`, `update-booking-form`.

### Step 3 — Make your changes

Edit files, and check your work in the browser with `npm run dev` running.

### Step 4 — Verify before you commit

```bash
npm run build
```

This must pass. It's the same command Webflow runs on deploy — if it fails here, it fails there.

Optionally check code style:

```bash
npm run lint
```

### Step 5 — Review what you're about to commit

```bash
git status
```

Look at the list. If you see anything unexpected — a `.env`, a stray file, something you didn't touch — stop and sort it out first.

### Step 6 — Commit

```bash
git add -A
git commit -m "Fix invoice total not including cleaning fee"
```

Write the message as what the change *does*, not what you did. "Fix date validation on booking form" beats "updates" or "fixes".

### Step 7 — Push your branch

```bash
git push -u origin your-branch-name
```

After the first push on a branch, later pushes are just `git push`.

### Step 8 — Open a Pull Request

Go to the repo on GitHub — it will offer a **"Compare & pull request"** button. Open the PR, describe what changed, and request a review.

**Do not merge your own PR without review.** Merging to `main` publishes it.

---

## 4. Where things live

```
seaview/
├── .github/workflows/       CI — includes the Supabase keep-alive ping
├── base44/                  Entity schemas from the original Base44 export.
│                            Reference only — nothing reads these at runtime.
├── public/                  Static files copied to the build as-is
├── src/
│   ├── api/
│   │   └── base44Client.js  ★ The data layer. Currently a localStorage mock.
│   │                          Swap this one file to move to a real backend.
│   ├── components/
│   │   ├── ui/              50 generic components (button, dialog, table…).
│   │   │                    shadcn/ui — avoid editing, they're regenerable.
│   │   ├── bookings/        Feature components, grouped by domain
│   │   ├── guests/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── portal/          Guest-facing portal
│   │   └── Layout.jsx       App shell, sidebar, ProtectedRoute, etc.
│   ├── hooks/               Shared React hooks (use-mobile, use-size)
│   ├── lib/
│   │   ├── AuthContext.jsx  Auth state for the whole app
│   │   ├── seaview.js       Domain logic — currency, dates, night counts
│   │   ├── query-client.js  React Query setup
│   │   └── utils.js         Tailwind class merging
│   ├── pages/               20 route components — one file per screen
│   ├── App.jsx              Route definitions
│   └── main.jsx             Entry point
├── index.html               HTML shell — fonts and favicon live here
├── vite.config.js           Build config
├── tailwind.config.cjs      Theme: colors, fonts, spacing
└── webflow.json             Tells Webflow Cloud this is a Vite app
```

### Where to put new code

| You're adding… | Put it in |
| --- | --- |
| A new screen/route | `src/pages/` — then register it in `src/App.jsx` |
| A component used by one feature | `src/components/<feature>/` |
| A component used across features | `src/components/` |
| A generic UI primitive | Check `src/components/ui/` first — it probably exists |
| Business logic or a formatter | `src/lib/seaview.js` |
| A data read or write | Go through `src/api/base44Client.js`, never around it |

### Two rules worth following

**Never call a backend directly from a component.** Everything goes through `src/api/base44Client.js`. That's what makes swapping the mock for a real database a one-file change instead of a 90-file one.

**Don't edit `src/components/ui/`.** Those are shadcn/ui primitives. If one needs different behaviour, wrap it in your own component rather than modifying it in place.

---

## 5. Things that will confuse you

### There is no real database

The app runs on a **mock backend** in `src/api/base44Client.js`. Data lives in your browser's `localStorage`.

This means:

- Every developer has their own separate data
- If you add a booking, nobody else sees it — this is expected, not a bug
- Every visitor to the deployed site gets their own empty copy
- Clearing browser data wipes it

To reset your local data, run this in the browser console:

```js
localStorage.removeItem('seaview_mock_db'); location.reload();
```

A real backend is still to be decided. When it arrives, `src/api/base44Client.js` is the only file that needs rewriting — the rest of the app calls it through a fixed interface.

### The app started life on Base44

This was exported from Base44 and then decoupled from it. You may still see `@base44/sdk` in `package.json` and a `base44/` folder holding entity schemas. Those schemas are useful as documentation of the data shapes, even though nothing reads them at runtime.

### Don't commit generated folders

`node_modules/` and `dist/` are gitignored on purpose. They're rebuilt from `package.json` and source, so committing them causes noise and conflicts. If you see them in `git status`, something is wrong with the ignore file — say so rather than committing them.

---

## 6. When something goes wrong

### You committed to `main` by accident

Don't panic, and **don't push**. Move the commit to a branch:

```bash
git branch my-fix
git reset --hard origin/main
git checkout my-fix
```

Your work is now on `my-fix`, and `main` is back to matching the remote.

### Your push was rejected

Usually means someone else pushed first. Get their changes, then push again:

```bash
git pull --rebase
git push
```

### You have merge conflicts

Git marks the conflicting sections in the affected files. Open each one, pick the correct result, delete the `<<<<<<<`, `=======`, and `>>>>>>>` marker lines, then:

```bash
git add .
git rebase --continue
```

If it gets messy, `git rebase --abort` returns you to where you started. Nothing is lost.

### You want to throw away uncommitted changes

```bash
git restore .
```

This is irreversible for uncommitted work. Make sure that's what you want.

---

## 7. Quick reference

```bash
# Start work
git checkout main && git pull
git checkout -b my-branch

# Develop
npm run dev

# Before pushing
npm run build
git status

# Ship it
git add -A
git commit -m "Clear description of the change"
git push -u origin my-branch
# then open a PR on GitHub
```

---

## Project commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:5173` |
| `npm run build` | Production build — must pass before pushing |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix what it can |

---

## Stack

React 18 · Vite 6 · Tailwind CSS · React Router · Radix UI · Deployed on Webflow Cloud
