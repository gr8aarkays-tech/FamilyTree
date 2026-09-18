# Family Tree PWA

A modern, offline-first **Progressive Web App** for building and preserving your family history.  
Installable directly from Google Chrome as a **PWA / WebAPK** — no Google Play Store required.

---

## Features

| Category | Details |
|---|---|
| **Core** | Create multiple independent family trees, add/edit/delete people and relationships |
| **Visualization** | Zoomable/pannable SVG tree canvas, classic top-down layout |
| **Relationship Engine** | Normalized parent-child/spouse graph; derives Father, Mother, Uncle, Cousin, etc. automatically |
| **Anchor/Me mode** | Set any person as your reference point; view all relationships relative to them |
| **Person cards** | Gender-color-coded cards with photo, DOB, deceased indicator, initials avatar |
| **Search** | Real-time search by name, email, phone within any tree |
| **Reminders** | Birthday & death-anniversary reminders with configurable timing (same day → 7 days before) |
| **Themes** | Light/Dark/System/High-contrast + 6 visual themes, custom gender colors |
| **Offline first** | IndexedDB local storage — works completely offline after first load |
| **PWA install** | Chrome "Add to Home Screen" / WebAPK install banner |
| **Import/Export** | Full JSON backup/restore for cross-device transfer |
| **Settings** | Appearance, notifications, data management, privacy info |
| **Onboarding** | First-time guided wizard with optional import |

---

## Tech Stack

- **React 19** + **TypeScript** (strict)
- **Vite** + **@tailwindcss/vite**
- **vite-plugin-pwa** + **Workbox** (service worker / offline)
- **idb** (IndexedDB wrapper)
- **react-router-dom** v6
- **uuid** for UUIDs

---

## Project Structure

```
src/
  types/index.ts              — All data models & interfaces
  services/
    db.ts                     — IndexedDB CRUD layer
    relationshipEngine.ts     — Relationship graph & label derivation
    reminderEngine.ts         — Upcoming birthday/anniversary calculations
  contexts/
    SettingsContext.tsx        — App settings (theme, colors, notifications)
    TreeContext.tsx            — Active tree state & CRUD helpers
  components/
    AppLayout.tsx              — Bottom nav (mobile) + left sidebar (desktop)
    TreeVisualization.tsx      — SVG tree canvas (zoom, pan, pinch)
    PersonCard.tsx             — Person node card
    PersonDetailsPanel.tsx     — Right panel with details & actions
    PersonForm.tsx             — Add/Edit person form
    AddRelativeWizard.tsx      — Step-by-step relative wizard
    InstallBanner.tsx          — PWA install prompt
  pages/
    OnboardingPage.tsx         — First-run wizard
    HomePage.tsx               — Dashboard with trees + upcoming reminders
    TreesListPage.tsx          — All trees list
    TreeFormPage.tsx           — Create/Edit tree
    TreeViewPage.tsx           — Full tree view with panels
    RemindersPage.tsx          — Reminders management
    SettingsPage.tsx           — All settings
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run (development)

```bash
cd FamilyTree/app
npm install
npm run dev
```

Open http://localhost:5173 in Chrome.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

### Preview the production build

```bash
npm run preview
```

---

## PWA Installation (Chrome/Android)

1. Open the app in Google Chrome.
2. A small banner will appear at the bottom: **"Install Family Tree for a better app experience"**.
3. Tap **Install**.
4. Chrome generates a WebAPK and adds the app to your home screen.
5. The app runs in standalone mode — no browser UI, works offline.

> **Manual install:** Chrome menu → *Add to Home Screen*

---

## Deployment

The app is a fully static single-page application. Deploy the `dist/` folder to any static host:

### Netlify

```bash
npm run build
# Drag and drop dist/ to Netlify, or:
npx netlify deploy --prod --dir dist
```

Add a `_redirects` file inside `public/`:
```
/*  /index.html  200
```

### Vercel

```bash
npm run build
npx vercel --prod
```

### Nginx

```nginx
server {
    listen 80;
    root /var/www/family-tree/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    # Required for PWA: serve over HTTPS in production
}
```

> **Important:** PWA installation requires **HTTPS**. Use a valid TLS certificate in production.

---

## Data & Privacy

- All family data is stored **locally on your device** in IndexedDB.
- No data is sent to any server by default.
- Export a full JSON backup from **Settings → Data → Export**.
- Import the backup on a new device via **Settings → Data → Import** or the onboarding screen.

---

## Development Notes

### Adding a new tree view

Extend `TreeViewMode` in [`src/types/index.ts`](src/types/index.ts) and add a layout function in `TreeVisualization.tsx`.

### Adding a new relationship type

Add a mapping in [`src/services/relationshipEngine.ts`](src/services/relationshipEngine.ts) — the `describeFromPath` function covers depth-1 through depth-4 relationships and falls back gracefully for deeper paths.

### Extending the data model

The IndexedDB schema lives in [`src/services/db.ts`](src/services/db.ts). Increment `DB_VERSION` and add an `upgrade` migration case when changing the schema.

---

## Roadmap (Phase 2+)

- [ ] PDF export (jsPDF + html2canvas)
- [ ] Multiple tree view layouts (radial, horizontal, timeline)
- [ ] Google Drive sync
- [ ] Collaborative sharing with role-based permissions
- [ ] Authentication (Google Sign-In / email)
- [ ] Automated tests (Vitest + Playwright)
