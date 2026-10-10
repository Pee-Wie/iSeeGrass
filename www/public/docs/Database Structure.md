# iSeeGrass — Database Structure

**Engine:** MySQL (or MariaDB)
**Charset:** `utf8mb4` / `utf8mb4_unicode_ci`
**Backend:** PHP (plain, no framework) — `core/` folder
**Managed via:** `/database/migrattion/` migration SQL files + `/database/seed/` seed files

---

## Tables Overview

| Table | Purpose |
|---|---|
| `users` | All registered accounts (users + admins) |
| `sessions` | Server-side login sessions |
| `assessments` | Field assessment records created by users |
| `identifications` | CNN identification sessions |
| `identification_results` | Individual species results per identification run |
| `seagrass_catalog` | Admin-managed seagrass species reference catalog |

---

## 1. `users`

Stores all registered accounts. Role distinguishes admin from regular users; `position` stores the user's professional affiliation (from the profile form).

```sql
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(40)  NOT NULL UNIQUE,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,                       -- bcrypt hash
    first_name      VARCHAR(60)  NOT NULL,
    last_name       VARCHAR(60)  NOT NULL,
    middle_name     VARCHAR(60)  DEFAULT NULL,
    position        ENUM('Researcher','Student','Class Instructor','Other') NOT NULL DEFAULT 'Researcher',
    role            ENUM('user','admin') NOT NULL DEFAULT 'user',
    institution     VARCHAR(120) DEFAULT NULL,
    phone           VARCHAR(30)  DEFAULT NULL,
    bio             VARCHAR(280) DEFAULT NULL,
    avatar_url      VARCHAR(255) DEFAULT NULL,                   -- path or URL to profile picture
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Notes:**
- `username` and `email` are the login identifiers (`username` is used on the login form)
- `password_hash` stores bcrypt output only — never plain text
- `position` maps directly to the profile form dropdown
- `role` is internal only — never exposed in the UI as a filter; use `position` for that
- `avatar_url` stores relative path (e.g. `/public/uploads/avatars/42.jpg`) or NULL for initials fallback

---

## 2. `sessions`

Server-side session store. Used for auth + route protection. Each login creates a row; logout or expiry deletes it.

```sql
CREATE TABLE sessions (
    id              VARCHAR(128) PRIMARY KEY,                    -- random token: bin2hex(random_bytes(64))
    user_id         INT UNSIGNED NOT NULL,
    ip_address      VARCHAR(45)  DEFAULT NULL,                   -- IPv4 or IPv6
    user_agent      VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,                          -- e.g. NOW() + INTERVAL 7 DAY
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Notes:**
- `id` is a cryptographically random hex string, stored in an `HttpOnly` cookie
- Expired rows can be cleaned up by a scheduled job or on each login
- `ON DELETE CASCADE` ensures sessions are removed when a user is deleted

---

## 3. `assessments`

Assessment records created by users via the Assessment Manager (formerly editor). Each row is one saved assessment document.

```sql
CREATE TABLE assessments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         LONGTEXT     DEFAULT NULL,                   -- rich HTML content from the editor
    status          ENUM('draft','in_progress','finalized') NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Notes:**
- `content` stores the editor's HTML output
- `status` maps to the editor footer buttons: Save Draft → `draft`, In Progress → `in_progress`, Finalize → `finalized`
- Admin assessment page filters by `user_id`, `status`, and date range on `created_at`

---

## 4. `identifications`

One row per CNN identification session (a user uploads photos and clicks "Identify Species").

```sql
CREATE TABLE identifications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    image_count     TINYINT UNSIGNED NOT NULL DEFAULT 1,         -- number of photos submitted
    top_result      VARCHAR(120) DEFAULT NULL,                   -- scientific name of the top prediction
    top_confidence  DECIMAL(5,2) DEFAULT NULL,                   -- e.g. 94.75 (percent)
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_identifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 5. `identification_results`

Individual species predictions for each identification session. One session can return multiple candidate species.

```sql
CREATE TABLE identification_results (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identification_id   INT UNSIGNED NOT NULL,
    species_id          VARCHAR(60)  NOT NULL,                   -- matches seagrass_catalog.slug
    scientific_name     VARCHAR(120) NOT NULL,
    common_name         VARCHAR(120) DEFAULT NULL,
    confidence          DECIMAL(5,2) NOT NULL,                   -- percent, e.g. 87.30
    rank                TINYINT UNSIGNED NOT NULL DEFAULT 1,     -- 1 = top result, 2 = second, etc.
    CONSTRAINT fk_id_results_ident FOREIGN KEY (identification_id) REFERENCES identifications(id) ON DELETE CASCADE
);
```

**Notes:**
- Typically 1–3 rows per identification session (top-N predictions from the CNN)
- `species_id` slug corresponds to the catalog and `species-data.js` `id` field

---

## 6. `seagrass_catalog`

Admin-managed catalog of seagrass species. Used for the Reports > Seagrass Catalog CRUD table. Seeded from `species-data.js` for the Negros-region species initially.

```sql
CREATE TABLE seagrass_catalog (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug                VARCHAR(80)  NOT NULL UNIQUE,            -- e.g. "enhalus-acoroides"
    scientific_name     VARCHAR(120) NOT NULL,
    common_name         VARCHAR(120) DEFAULT NULL,
    family              VARCHAR(80)  DEFAULT NULL,
    genus               VARCHAR(80)  DEFAULT NULL,
    region              VARCHAR(120) DEFAULT NULL,               -- e.g. "Negros"
    description         TEXT         DEFAULT NULL,
    iucn_status         VARCHAR(20)  DEFAULT NULL,               -- e.g. "Least Concern"
    in_cnn_scope        TINYINT(1)   NOT NULL DEFAULT 0,         -- 1 = included in CNN identification
    status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Notes:**
- `slug` matches the `id` field in `species-data.js` for cross-referencing
- `in_cnn_scope` = 1 for the ~6–8 Negros-region species the CNN model is trained on
- `status` = inactive hides the species from user-facing lists without deleting it
- Admin can add/edit/delete rows via the Reports > Seagrass Catalog modal

---

## Relationships

```
users ──< sessions              (one user → many sessions)
users ──< assessments           (one user → many assessments)
users ──< identifications       (one user → many identification runs)
identifications ──< identification_results   (one run → multiple predictions)
seagrass_catalog                (standalone; referenced by identification_results.species_id)
```

---

## Indexes (recommended)

```sql
-- Fast user lookup by login fields
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status   ON users(status);

-- Session lookup by token (already PK) + expiry cleanup
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Assessment filtering (admin page filters)
CREATE INDEX idx_assessments_user_id   ON assessments(user_id);
CREATE INDEX idx_assessments_status    ON assessments(status);
CREATE INDEX idx_assessments_created   ON assessments(created_at);

-- Identification history
CREATE INDEX idx_identifications_user  ON identifications(user_id);
CREATE INDEX idx_identifications_date  ON identifications(created_at);

-- Catalog search
CREATE INDEX idx_catalog_slug          ON seagrass_catalog(slug);
CREATE INDEX idx_catalog_scope         ON seagrass_catalog(in_cnn_scope);
```

---

## Seed Data — Negros Region Species

The following 6 species should be seeded into `seagrass_catalog` with `in_cnn_scope = 1`:

| slug | scientific_name | common_name | family | region |
|---|---|---|---|---|
| `enhalus-acoroides` | Enhalus acoroides | Tape Seagrass | Hydrocharitaceae | Negros |
| `thalassia-hemprichii` | Thalassia hemprichii | Hemprich's Seagrass | Hydrocharitaceae | Negros |
| `halophila-ovalis` | Halophila ovalis | Dugong Grass | Hydrocharitaceae | Negros |
| `cymodocea-rotundata` | Cymodocea rotundata | Rotund Cymodocea | Cymodoceaceae | Negros |
| `halodule-uninervis` | Halodule uninervis | Spade Grass | Cymodoceaceae | Negros |
| `syringodium-isoetifolium` | Syringodium isoetifolium | Needle Seagrass | Cymodoceaceae | Negros |

---

## Next Steps — Backend (auth first)

1. **Setup:** Create `core/config/db.php` (PDO connection), `core/config/env.php` (loads `.env` vars), `core/helpers/` for shared utilities (response helpers, password hashing wrappers)
2. **Migrations:** Create SQL files in `database/migrattion/` — one file per table in dependency order:
   - `001_users.sql`
   - `002_sessions.sql`
   - `003_assessments.sql`
   - `004_identifications.sql`
   - `005_identification_results.sql`
   - `006_seagrass_catalog.sql`
3. **Seed:** Create `database/seed/catalog.seed.sql` for the 6 Negros-region CNN species
4. **Auth endpoints** (`core/api/auth/`):
   - `POST /api/auth/login.php` — validate credentials via PDO, create session row, set `HttpOnly` cookie
   - `POST /api/auth/logout.php` — delete session row, clear cookie
   - `GET  /api/auth/me.php` — return current user JSON from session (used by route protection)
5. **Middleware** (`core/app/middleware/`):
   - `require_auth.php` — reads session cookie → DB lookup → sets `$currentUser`; returns 401 JSON if missing/expired
   - `require_admin.php` — runs after `require_auth`; returns 403 JSON if `$currentUser['role'] !== 'admin'`
6. Apply middleware via `require_once` at the top of every admin API file and include an auth-check script in every admin HTML page (`/views/admin/`)
