# iSeeGrass — Project Prompt Guide & Decision Log

This document records the full project context, design decisions, and current state so any new session can pick up exactly where we left off without re-explaining the whole system.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla HTML / CSS / JS + Tabler CSS framework |
| Components | Web Components (custom elements) |
| Mobile | Capacitor (Android APK wrapper over the web app) |
| Backend | PHP (plain, no framework) |
| Database | MySQL / MariaDB |
| CNN Model | CREYNet (Python / TensorFlow / Keras) — called by PHP via `shell_exec()` |
| Server | XAMPP / LAMPP (local dev) |

Backend lives in `core/` — structure: `core/api/`, `core/app/controller/`, `core/app/middleware/`, `core/app/model/`, `core/config/`, `core/helpers/`.

DB migration files → `database/migrattion/` (note: folder is already named with the typo — keep it)
DB seed files → `database/seed/`

---

## Roles

| Role | Access |
|---|---|
| `guest` | Public pages only (Landing, About, Contact, Explore, Guest Identify) |
| `user` | Logged-in user pages: Home, Dashboard, Identify, Assessment, Profile |
| `admin` | Everything + Admin panel: Users, Assessments (all), Identify, Reports, Catalog |

`role` is stored in the DB (`user` or `admin`) and is internal only — never shown in UI as a label.
`position` (Researcher / Student / Class Instructor / Other) is the user-facing affiliation label.

---

## Page Inventory

### Public / Guest pages
- `index.html` (landing)
- `public/about.html`
- `public/contacts.html`
- `public/explore.html` — browse seagrass catalog (no login needed)
- Guest Identify — public version of identify, results not saved, erased on refresh/close, web only

### Auth pages (`views/auth/`)
- `login.html` — username + password login form; also has "Reset Password" toggle and "Sign Up" modal link

### User pages (`views/users/`)
- `index.html` — user home / welcome
- `dashboard.html` — personal stats (identifications, observations, species found), recent activity, species breakdown
- `identify.html` — CNN identification page (see below)
- `editor.html` — Assessment Manager (rich-text editor + templates + saved assessments list)
- `profile.html` — personal info, avatar, password change, stats

### Admin pages (`views/admin/`)
- `index.html` — admin home, platform stat cards, quick actions
- `dashboard.html` — platform-wide stats + recent activity + species breakdown
- `users.html` — user management table: search, filter by position/status, create account modal, deactivate/delete
- `assessment.html` — read-only view of ALL users' assessments, filters by user/species/date/status, detail modal
- `identify.html` — same as user identify page, admin navbar
- `report.html` — tabbed: Platform Statistics (date range, charts, CSV/PDF export) + Seagrass Catalog CRUD (add/edit/delete species via inline modal)

---

## Identify Page — Detailed Behaviour

### Layout
- 75% left card: identification area
- 25% right card: Photo Collection sidebar
- Right sidebar: Identification History (session + persistent for logged-in users)

### Photo Collection (25%)
- Upload (file picker, multi) or Capture (camera, mobile)
- Each photo card has: thumbnail, Rename, Send, Remove buttons
- Rename format: `newname(oldname).ext`
- Send: sends selected photo to the 75% area for identification (only one at a time)
- Can't select a new photo to send if one is already in the 75% area
- Remove: deletes from collection; captured images not yet identified are permanently deleted

### Identification Area (75%)
- Accepts photo via drag from collection (desktop mouse) or Send button (mobile)
- Also accepts direct drag-and-drop from local file system (desktop)
- No Capture button here
- When a photo is present, 3 action buttons appear: Identify, Save Result, Clear
- Result display: species name, confidence score(s), all 4 class scores (Background Substrate shown as "No seagrass detected" if top result)

### Identification History (right sidebar)
- Shows past identification sessions for the logged-in user
- Each entry: thumbnail, species name, confidence, date/time
- Clicking opens full result detail
- Guest users: history not shown / not saved

---

## Assessment Page — Detailed Behaviour

- Create new assessment session (location, GPS coords, date, site name, observer)
- Add quadrats to the session; each quadrat can have multiple photos
- Each quadrat photo is sent to CREYNet for identification
- Per quadrat result: species list, % cover per species, abundance rating
- Session summary: species composition, average % cover, dominant species
- Actions: view, export (PDF), delete
- Tied to logged-in user; stored permanently

### Assessment Editor (users/editor.html)
- Rich-text editor (contenteditable + formatting toolbar)
- Templates: Blank, Transect Quadrat (8-quadrat table), Species Observation
- Saved Assessments list in left sidebar
- Status flow: Draft → In Progress → Finalized
- Actions: Save Draft, In Progress, Finalize, Clear, Preview, Insert Transect Table, Import, Print

---

## CNN Model — CREYNet

Full details in `CNN_Integ.md`. Key points:

- Model name: **CREYNet** (Convolutional Recognition of Eelgrass Yards)
- Current version: `CREYNet_v0.02.keras` (also `.tflite` for speed)
- Current classes (4-output softmax):
  - 0: Background Substrate
  - 1: Halophila spinulosa
  - 2: Cymodocea rotundata
  - 3: Halodule pinifolia
- Future 6-class expansion planned but NOT implemented yet
- PHP calls Python via `shell_exec()` → `predict_api.py` → prints JSON to stdout → PHP decodes
- Image preprocessing: resize to 260×289, VGG16 mean subtraction (R−123.68, G−116.78, B−103.94)
- Background Substrate result → UI shows "No seagrass detected"

---

## Database — Current Schema

Full schema in `Database Structure.md`. Tables:

| Table | Purpose |
|---|---|
| `users` | All accounts (role: user/admin; position: Researcher/Student/Class Instructor/Other) |
| `sessions` | Server-side session tokens (HttpOnly cookie → DB row) |
| `assessments` | Assessment editor documents (draft/in_progress/finalized) |
| `identifications` | One row per CNN identification run |
| `identification_results` | Top-N predictions per run |
| `seagrass_catalog` | Admin-managed species reference + CNN scope flag |

Session token generated by PHP: `bin2hex(random_bytes(64))` stored as VARCHAR(128) PK.

---

## CSS / JS File Management Convention

### User pages
```
public/css/users/styles-users.css          ← shared base (also contains all .isee-navbar* styles)
public/css/users/<page>/styles-users-<page>.css
public/js/users/<page>/script-users-<page>.js
```

### Admin pages
```
public/css/users/styles-users.css          ← MUST be linked (navbar styles live here)
public/css/admin/styles-admin.css          ← admin theme variables
public/css/admin/<page>/styles-admin-<page>.css
public/js/admin/<page>/script-admin-<page>.js
```

### Link order in every admin `<head>`
```html
<link rel="stylesheet" href="../../resources/tabler/css/tabler.css">
<link rel="stylesheet" href="../../resources/tabler/css/tabler.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.48.0/dist/tabler-icons.min.css">
<link rel="stylesheet" href="../../public/css/users/styles-users.css">
<link rel="stylesheet" href="../../public/css/admin/styles-admin.css">
<link rel="stylesheet" href="../../public/css/admin/<page>/styles-admin-<page>.css">
```

### Script order in every admin `</body>`
```html
<script type="module" src="../../components/navbar-admin.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/js/tabler.min.js"></script>
<script src="../../public/js/admin/<page>/script-admin-<page>.js"></script>
<script src="/js/back-handler.js"></script>
```

---

## Components

| File | Tag | Used by |
|---|---|---|
| `components/navbar-user.js` | `<isee-navbar-user>` | All user pages |
| `components/navbar-admin.js` | `<isee-navbar-admin>` | All admin pages |
| `components/sidebar-users-identify.js` | `<isee-identify-history>` | identify.html, editor.html |
| `components/modal-utils.js` | (utility module) | identify.html, editor.html |

Both navbars use identical HTML structure / CSS classes. All `.isee-navbar*` styles are in `styles-users.css`.

---

## Admin Users Page — Specifics

- Filter bar: Search (name/email), Position dropdown (All / Researcher / Student / Class Instructor / Other), Status dropdown (All / Active / Inactive), Reset
- Table columns: # | Name | Email | Position | Status | Joined | Actions
- Position badge = user's `position` field (not `role`)
- Actions: Edit, Deactivate/Reactivate, Delete
- "Create Account" button top-right → opens inline modal
- Create Account modal fields: First Name, Last Name, Email, Username, Position, Password, Confirm Password
- Client-side validation in `script-admin-users.js`; API call stubbed with TODO comment

---

## Admin Report Page — Specifics

- Tab 1: Platform Statistics — date range picker, 4 stat cards, chart placeholders, CSV/PDF export
- Tab 2: Seagrass Catalog — search, CRUD table (6 sample Negros species seeded), Add/Edit modal, Delete confirm modal
- Add/Edit modal fields: Scientific Name, Common Name, Family, Region, Description, Status, CNN Scope checkbox
- Catalog table columns: # | Scientific Name | Common Name | Family | Region | Status | Actions

---

## What's Done

- [x] All 6 admin HTML pages built (`index`, `dashboard`, `users`, `assessment`, `identify`, `report`)
- [x] Admin navbar component (`navbar-admin.js`) — full sidebar with icons, active-link detection, mobile toggler
- [x] CSS/JS per-page file structure for admin (mirrors user pattern)
- [x] `editor.html` renamed to `assessment.html` in both user and admin sections
- [x] Create Account modal on admin users page (with client-side validation)
- [x] Position/role split: `position` = UI label, `role` = internal admin/user
- [x] Database Structure doc written (`Database Structure.md`)
- [x] CNN Integration doc written (`CNN_Integ.md`)

## What's Next

1. **DB creation** — run migration SQL files to create all 6 tables + indexes
2. **Seed** — insert 6 Negros-region species into `seagrass_catalog`
3. **Backend auth** (PHP):
   - `core/config/db.php` — PDO connection
   - `core/api/auth/login.php` — validate, create session, set cookie
   - `core/api/auth/logout.php` — delete session, clear cookie
   - `core/api/auth/me.php` — return current user from session
   - `core/app/middleware/require_auth.php`
   - `core/app/middleware/require_admin.php`
4. **Route protection** — every admin page checks session on load; redirect to login if not admin
5. **User management API** — CRUD for users table
6. **Assessment API** — list all assessments (admin), CRUD for user assessments
7. **Identification API** — save identification results, history endpoint
8. **Catalog API** — CRUD for seagrass_catalog
9. **CNN integration** — `predict_api.py` + `core/api/identify.php`
10. **Report API** — date-range stats queries, CSV export
