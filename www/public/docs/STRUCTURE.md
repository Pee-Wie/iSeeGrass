# iSeeGrass Project Structure

```
iSeeGrass/
│
├── www/                          # Shared frontend (web + Android via Capacitor)
│   │
│   ├── index.html                # Main entry point
│   ├── manifest.json             # Web app manifest
│   │
│   ├── components/               # Web component JS files (custom elements)
│   │   ├── header.js
│   │   ├── footer.js
│   │   ├── footer-aid.js
│   │   ├── navbar-user.js
│   │   ├── navbar-admin.js
│   │   ├── wp-site-header.js
│   │   ├── wp-site-navbar.js
│   │   └── wp-site-footer.js
│   │
│   ├── js/                       # Top-level scripts
│   │   └── app.js
│   │
│   ├── views/                    # HTML page views (role-based)
│   │   ├── auth/
│   │   │   ├── login.html
│   │   │   ├── signup.html
│   │   │   └── backup/           # Backup copies of auth pages
│   │   │
│   │   ├── admin/
│   │   │   ├── index.html        # Admin home / landing
│   │   │   ├── dashboard.html
│   │   │   ├── identify.html
│   │   │   ├── editor.html
│   │   │   ├── users.html
│   │   │   ├── report.html
│   │   │   └── sgp.html          # Seagrass species/dataset management
│   │   │
│   │   └── users/
│   │       ├── index.html        # User home / landing
│   │       ├── dashboard.html
│   │       ├── identify.html
│   │       ├── editor.html
│   │       └── profile.html
│   │
│   ├── public/                   # Publicly accessible static assets
│   │   │
│   │   ├── about.html
│   │   ├── contacts.html
│   │   ├── explore.html
│   │   │
│   │   ├── guest/
│   │   │   └── Aid.html          # Guest-accessible aid / help page
│   │   │
│   │   ├── css/                  # Stylesheets (mirrored structure to views)
│   │   │   ├── styles.css        # Global styles
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── login.css
│   │   │   │   └── request.css
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   └── styles-admin.css
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── styles-users.css          # Shared users styles
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── styles-users-dashboard.css
│   │   │   │   └── homepage/
│   │   │   │       └── styles-users-homepage.css
│   │   │   │
│   │   │   ├── guest/
│   │   │   │   ├── styles.css
│   │   │   │   └── aid.css
│   │   │   │
│   │   │   ├── api/              # (reserved)
│   │   │   └── config/           # (reserved)
│   │   │
│   │   ├── js/                   # Scripts (mirrored structure to views)
│   │   │   ├── species-data.js   # Seagrass species data
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── login.js
│   │   │   │   └── request.js
│   │   │   │
│   │   │   ├── admin/            # (reserved)
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── script-users-dashboard.js
│   │   │   │   └── homepage/
│   │   │   │       └── script-users-homepage.js
│   │   │   │
│   │   │   ├── guest/
│   │   │   │   ├── script.js
│   │   │   │   └── photo-collector.js
│   │   │   │
│   │   │   ├── api/              # (reserved)
│   │   │   ├── config/           # (reserved)
│   │   │   └── utils/            # (reserved)
│   │   │
│   │   ├── icons/                # App icons (PNG)
│   │   ├── images/               # Content images
│   │   └── docs/                 # Project documentation (this file)
│   │       ├── STRUCTURE.md
│   │       ├── iSeeGrass-Development-Assistant-Guide.md
│   │       └── Capacitor Command.md
│   │
│   └── resources/                # Third-party assets (not modified)
│       ├── icons/                # PWA icons (WebP)
│       └── tabler/               # Tabler UI framework (CSS, JS, libs)
│
├── core/                         # Backend (PHP)
│   ├── app/
│   │   ├── controller/           # Route/request controllers
│   │   ├── model/                # Database models
│   │   └── middleware/           # Auth and request middleware
│   │
│   ├── api/                      # API endpoint handlers
│   ├── config/                   # App configuration files
│   └── helpers/                  # Utility/helper functions
│
├── database/
│   ├── migrattion/               # Database migration files
│   └── seed/                     # Seed data
│
├── android/                      # Capacitor Android project (generated)
│   └── app/src/main/assets/public/  # Synced build output from www/
│
├── assets/                       # Source app icon assets
├── backup/                       # APK backups
├── App-Build History/            # APK release history
├── node_modules/                 # npm dependencies (Capacitor CLI, etc.)
├── capacitor.config.json         # Capacitor configuration
├── package.json
└── README.md
```

---

## CSS and JS File Naming Convention

CSS files and JS files follow a mirrored folder structure under `www/public/css/` and `www/public/js/`.

### Page-specific CSS
```
www/public/css/<role>/<page>/styles-<role>-<page>.css
```
Examples:
- `css/users/dashboard/styles-users-dashboard.css`
- `css/users/homepage/styles-users-homepage.css`
- `css/admin/styles-admin.css`
- `css/auth/login.css`

### Page-specific JS
```
www/public/js/<role>/<page>/script-<role>-<page>.js
```
Examples:
- `js/users/dashboard/script-users-dashboard.js`
- `js/users/homepage/script-users-homepage.js`
- `js/auth/login.js`
- `js/guest/photo-collector.js`

### Shared styles
- `css/styles.css` — global styles applied across all pages
- `css/users/styles-users.css` — styles shared across all user pages
- `css/admin/styles-admin.css` — styles shared across all admin pages

---

## Notes

- The `www/` folder is the shared frontend for both the web application and the Android app packaged via Capacitor.
- The `android/app/src/main/assets/public/` folder is a synced copy of the built `www/` output. Do not edit it directly.
- The `core/` folder contains the PHP backend. It is not served through the Android app.
- The `resources/tabler/` folder contains the Tabler UI framework files used for styling and components.
- File and folder names use lowercase and hyphens (kebab-case) as the standard convention.
