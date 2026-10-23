# iSeeGrass — Guide & Explanation

> **Who this is for:** Anyone joining the project — even if you've never built a web app before.
> Think of this as the "big picture before you touch any code" document.

---

## What is iSeeGrass?

iSeeGrass is a tool for researchers, students, and instructors to **identify and record seagrass species** in the field. You take a photo of seagrass underwater, upload it, and the app uses a trained AI model (CNN) to tell you which species it is and how confident it is about the answer.

**Real-life scenario:**
> Maria is a marine biology student in Negros. She's wading in shallow water and spots some seagrass. She opens iSeeGrass on her phone, takes a photo, and taps "Identify." A few seconds later the app says: *"Enhalus acoroides — 94% confidence."* She saves the result, links it to her field assessment report, and moves on to the next quadrat.

---

## The Two Big Parts of the App

```
iSeeGrass
├── Frontend  →  what the user sees (HTML / CSS / JavaScript)
└── Backend   →  the server-side logic and database (PHP + MySQL)
```

Think of it like a restaurant:
- **Frontend** = the dining room, menu, and waiter. It's what you interact with.
- **Backend** = the kitchen. It stores the data, checks who you are, and does the heavy lifting.

They talk to each other through **API endpoints** — little "order windows" the frontend sends requests to and gets responses from.

---

## How the Folder Structure Works

Here's a simplified mental model. Full detail is in `STRUCTURE.md`.

```
iSeeGrass/
├── www/              ← Everything the browser sees
│   ├── views/        ← The actual HTML pages (split by role)
│   ├── components/   ← Reusable bits like the navbar and footer
│   └── public/       ← CSS, JS, images, icons, docs (this file!)
│
├── core/             ← PHP backend (never touches the user's browser directly)
│   ├── api/          ← API endpoints (login, logout, save result, etc.)
│   ├── app/          ← Controllers, models, middleware
│   ├── config/       ← DB connection, environment settings
│   └── helpers/      ← Shared utility functions
│
└── database/
    ├── migrattion/   ← SQL files that create the tables (note: typo in folder name — keep it)
    └── seed/         ← SQL files that pre-fill the species catalog
```

---

## Who Can Use the App? (Roles)

There are three kinds of people the app knows about:

| Who | What they can do |
|---|---|
| **Guest** | Browse public pages (landing, about, explore seagrass catalog). Can try the identify tool — but results are *not* saved. |
| **User** | Logged-in researcher/student. Can identify species, save results, write assessment reports, view their history. |
| **Admin** | Everything a user can do, plus manage other users, view all assessments, manage the species catalog, and see platform-wide reports. |

**Real-life scenario:**
> Dr. Santos is the admin. She logs in and sees every student's assessment. She can deactivate an old account, add a newly discovered seagrass species to the catalog, or export a report of all identifications this month.

The role (`user` or `admin`) is stored in the database. It's **internal only** — users never see "you are role: user" in the UI. What they *do* see is their **position** (Researcher, Student, Class Instructor, Other).

---

## The Pages — What Each One Does

### Public pages (no login needed)
- **Landing page** (`index.html`) — app intro, call to action
- **About** — project background
- **Contacts** — contact info
- **Explore** — browse the seagrass species catalog (read-only)
- **Guest Identify** — try the AI tool without an account; results vanish on close

### Auth pages
- **Login** — enter username + password to get in; also has a "Reset Password" section

### User pages (login required)
- **Home** — welcome screen
- **Dashboard** — your personal stats: how many identifications you've done, which species you've found, recent activity
- **Identify** — the main AI tool (see the detailed section below)
- **Assessment** — rich-text editor to write field assessment reports; save as Draft, In Progress, or Finalized
- **Profile** — update your info, change your avatar and password

### Admin pages (admin login required)
- **Home** — platform overview, quick-action buttons
- **Dashboard** — platform-wide stats for all users
- **Users** — manage all accounts (search, filter, create, deactivate, delete)
- **Assessment** — read-only view of *every* user's assessment (for oversight)
- **Identify** — same AI tool, admin navbar
- **Report** — two tabs: Platform Statistics (charts + export) and Seagrass Catalog CRUD (add/edit/delete species)

---

## The Identify Page in Detail

This is the heart of the app. Here's how it's laid out:

```
┌──────────────────────────────────────┬──────────────┐
│                                      │              │
│       Identification Area (75%)      │  Photo       │
│                                      │  Collection  │
│  ┌────────────────────────────────┐  │  (25%)       │
│  │  Drop photo here or send one   │  │              │
│  │  from the sidebar  →           │  │  [Photo 1]   │
│  │                                │  │  [Photo 2]   │
│  │  [Identify] [Save] [Clear]     │  │  [Photo 3]   │
│  └────────────────────────────────┘  │              │
│                                      │  History ↓   │
│  Result: Enhalus acoroides           │  past runs   │
│  Confidence: 94.75%                  │              │
└──────────────────────────────────────┴──────────────┘
```

**Workflow:**
1. Add photos to the right sidebar (upload from file or capture from camera on mobile).
2. Tap **Send** on a photo — it moves to the big area on the left.
3. Tap **Identify** — the app sends the image to the AI model and shows the result.
4. Tap **Save Result** — saves it to your history (logged-in users only).
5. Tap **Clear** — remove the photo and start over.

**Real-life scenario:**
> Jake uploads 5 photos from his diving trip. He sends them one by one to the identification area, identifies each, and saves the results. Later on his laptop he reviews all 5 saved results on his Dashboard.

---

## The AI Model — CREYNet

**CREYNet** stands for *Convolutional Recognition of Eelgrass Yards Network*. It's a trained image-classification model (think: a very specialized photo-recognition system).

**How it works (simplified):**
1. You submit a photo.
2. PHP on the server calls a Python script (`predict_api.py`) using `shell_exec()`.
3. Python resizes the image to 260×289 pixels, normalizes the colors, runs it through CREYNet.
4. CREYNet outputs 4 confidence scores — one per class.
5. Python prints a JSON result; PHP reads it and sends it back to the browser.

**Current classes (what CREYNet can identify right now):**

| Class | What it means |
|---|---|
| Background Substrate | No seagrass → shows as "No seagrass detected" in the UI |
| Halophila spinulosa | A seagrass species |
| Cymodocea rotundata | A seagrass species |
| Halodule pinifolia | A seagrass species |

> A 6-class expansion is planned but not built yet.

---

## The Database — Six Tables

Think of the database as a collection of spreadsheets that are connected to each other.

### 1. `users` — the accounts spreadsheet
Every registered person has one row. Stores name, email, hashed password, role, position, etc.

**Real-life analogy:** The school's student/staff registry.

Key fields:
- `role` — `user` or `admin` (internal)
- `position` — Researcher / Student / Class Instructor / Other (shown in UI)
- `password_hash` — the password is **never** stored as plain text; it's run through bcrypt first
- `avatar_url` — path to the profile picture, or NULL if using initials fallback

---

### 2. `sessions` — the login tokens spreadsheet
When you log in, PHP creates a random 128-character token, stores it here, and puts it in your browser's cookie. Every time you load a page, PHP looks up the token to confirm you're still logged in.

**Real-life analogy:** The wristband at an event. You show it at the door; staff check it's valid. When you leave (logout) they cut it off (delete the row).

Key fields:
- `id` — the token itself (random hex string)
- `expires_at` — sessions expire after 7 days automatically

---

### 3. `assessments` — the field reports spreadsheet
Each row is one saved assessment document from the Assessment editor. Stores the rich-text HTML content, who wrote it, and its current status.

**Status flow:**
```
Draft  →  In Progress  →  Finalized
```

---

### 4. `identifications` — the "I ran the AI" log
Each time someone clicks **Identify**, one row is created here. It records who ran it, how many photos were submitted, and what the top result was.

---

### 5. `identification_results` — the detailed scores
For each identification run (row in `identifications`), up to 3 candidate species are stored here with their confidence percentages and ranking.

**Real-life analogy:** If `identifications` is a test attempt, then `identification_results` is each answer on that test.

---

### 6. `seagrass_catalog` — the species reference library
Admin-managed list of seagrass species. This is what populates the Explore page and the Report > Seagrass Catalog tab. Species with `in_cnn_scope = 1` are the ones CREYNet is trained to identify.

**Currently seeded species (Negros region, all CNN-scoped):**

| Scientific Name | Common Name |
|---|---|
| Enhalus acoroides | Tape Seagrass |
| Thalassia hemprichii | Hemprich's Seagrass |
| Halophila ovalis | Dugong Grass |
| Cymodocea rotundata | Rotund Cymodocea |
| Halodule uninervis | Spade Grass |
| Syringodium isoetifolium | Needle Seagrass |

---

## How the Tables Relate to Each Other

```
users ──────< sessions              One user can be logged in from many devices
users ──────< assessments           One user can have many saved reports
users ──────< identifications       One user can run many identification sessions
identifications ──< identification_results   Each run can return multiple species predictions

seagrass_catalog  (standalone — referenced by identification results via the slug field)
```

**Real-life scenario:**
> When admin Dr. Santos goes to the Users page and deletes a student account, all of that student's sessions, assessments, and identification history are automatically deleted too (this is the `ON DELETE CASCADE` rule in the DB).

---

## How Auth and Security Work

### Login flow
1. User submits username + password on `login.html`.
2. JS sends a `POST` request to `core/api/auth/login.php`.
3. PHP looks up the user by username, compares the submitted password against the stored bcrypt hash.
4. If valid: creates a random session token, inserts it into `sessions`, sets an `HttpOnly` cookie.
5. Browser stores the cookie. From now on, every request carries that cookie automatically.

### Route protection
- Every admin API file starts with `require_once 'require_admin.php'`.
- `require_admin.php` reads the cookie → looks up the token in `sessions` → checks `role = 'admin'`.
- If the check fails: returns a `403 Forbidden` JSON response. The admin page redirects to login.

**Why `HttpOnly` cookie?** JavaScript on the page can't read it, which protects against XSS attacks (where malicious scripts try to steal your token).

---

## CSS and JS File Naming — Quick Reference

Files mirror the view folder structure. The pattern is:

```
css/<role>/<page>/styles-<role>-<page>.css
js/<role>/<page>/script-<role>-<page>.js
```

Examples:
- `css/users/dashboard/styles-users-dashboard.css`
- `js/admin/users/script-admin-users.js`

**Shared/global files:**
- `css/styles.css` — applies everywhere
- `css/users/styles-users.css` — applies to all user *and* admin pages (navbar styles live here)
- `css/admin/styles-admin.css` — admin theme variables

> **Why does the admin page also load `styles-users.css`?**
> Because both navbars (`navbar-user.js` and `navbar-admin.js`) share the same CSS class names (`.isee-navbar*`). Admin pages load `styles-users.css` first so the navbar styles are available, then override with `styles-admin.css`.

---

## Web Components — Reusable UI Pieces

Instead of copy-pasting the same navbar HTML into every page, we use **Web Components** — custom HTML tags you register in JavaScript.

```html
<!-- Just drop this tag in your HTML and the full navbar appears -->
<isee-navbar-admin></isee-navbar-admin>
```

The JS file (`components/navbar-admin.js`) defines what that tag renders. Change it once, it updates everywhere.

**Component files:**

| File | Tag | Used on |
|---|---|---|
| `navbar-user.js` | `<isee-navbar-user>` | All user pages |
| `navbar-admin.js` | `<isee-navbar-admin>` | All admin pages |

---

## The Mobile App (Capacitor)

Capacitor is a tool that wraps the `www/` web app inside a native Android shell. The result is an `.apk` file you can install on a phone.

**How it works:**
1. You build the web app (copy `www/` into `android/app/src/main/assets/public/`).
2. Android opens a WebView (basically a browser inside the app) pointed at those files.
3. From the user's perspective it looks and feels like a native app.

**Important:** Never edit files directly inside `android/app/src/main/assets/public/` — that folder is a **copy** that gets overwritten every time you sync. Always edit in `www/`.

---

## What's Already Built vs. What's Next

### ✅ Done
- All 6 admin HTML pages
- Admin navbar component
- Per-page CSS/JS file structure
- Create Account modal (admin users page, client-side validation)
- Database schema designed and documented
- CNN integration documented

### 🔲 Next steps (in order)
1. **Create the database** — run the migration SQL files in `database/migrattion/`
2. **Seed the catalog** — insert the 6 Negros-region species
3. **Build PHP auth** — login, logout, session check (`core/api/auth/`)
4. **Add route protection** — middleware on every admin page/API
5. **User management API** — CRUD for the users table
6. **Assessment API** — save/load/list assessments
7. **Identification API** — save results, return history
8. **Catalog API** — CRUD for seagrass_catalog
9. **CNN integration** — wire `predict_api.py` to the identify endpoint
10. **Reports API** — date-range queries, CSV/PDF export

---

## Quick Glossary

| Term | Plain English |
|---|---|
| **API endpoint** | A URL the frontend sends data to and gets a response from (e.g. `POST /api/auth/login.php`) |
| **bcrypt** | A one-way scrambling algorithm for passwords. You can check if a password matches, but you can't reverse it to get the original. |
| **CNN** | Convolutional Neural Network — the AI image-recognition engine |
| **HttpOnly cookie** | A browser cookie that JavaScript can't read — safer for storing login tokens |
| **Migration** | A SQL file that creates or changes a database table in a controlled, repeatable way |
| **Seed** | A SQL file that inserts initial/default data (like the species catalog) |
| **Web Component** | A custom HTML tag (`<isee-navbar-admin>`) backed by a JS class that renders its own HTML/CSS |
| **Capacitor** | A tool that turns a web app into a mobile APK |
| **slug** | A URL-friendly version of a name, e.g. `enhalus-acoroides` instead of "Enhalus acoroides" |
| **PDO** | PHP Data Objects — the PHP library used to talk to MySQL safely (prevents SQL injection) |
