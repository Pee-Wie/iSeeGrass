# iSeeGrass

> **Status:** 🛠️ In Development  
> **(Master Repository)**

---

## Project Overview

Traditional seagrass assessment relies heavily on manual recording and specialized taxonomic expertise, which is labor-intensive and time-consuming. **iSeeGrass** addresses this gap by combining a **Convolutional Neural Network (CNN)** image recognition component with digital data management tools to assist in field assessments.

Operating as an integrated decision-support tool, the platform is designed around standardized ecological monitoring workflows to reduce observer bias and streamline data collection for marine researchers, field practitioners, and students. The system deploys split client architectures to maximize device compatibility—delivering an optimized web ecosystem alongside two distinct mobile deployment channels (a hybrid web-native app and a high-performance native mobile app) without replacing final manual expert verification.

### Key Features
* **AI-Powered Species Identification:** Identify documented seagrass species from captured or uploaded photos using a custom-trained Convolutional Neural Network (CNN).
* **Quadrat-Based Field Assessment:** Record species occurrence, abundance, and estimated percentage cover using a standardized 50cm × 50cm quadrat method.
* **Species Catalog:** Explore an embedded catalog containing approximately 18 seagrass species documented in the Philippines and 60+ global species.
* **Dual-Engine Mobile Availability:** Use the shared web/Capacitor client or the separate native Android application; their offline behavior differs.
* **Offline Queuing:** Authenticated web/Capacitor requests can be queued in IndexedDB. The native app keeps pending CNN and manual-key identifications in its local SQLite queue and syncs them when connectivity returns.
* **Verification and Review:** Review, correct, or flag low-confidence AI predictions (`Unknown / For Validation`) to maintain data integrity.

> 🛠️ **Current AI Scope:** The CNN's four base output categories are Background, Ferny, Rounded, and Strappy. The `6_species_proto` inference track derives six species-labeled estimates from those outputs using fixed weights; these are not six independently trained model classes. The reference catalog includes species beyond the CNN's demonstrated classification scope. Report species-level performance only when supported by a separate evaluation on appropriately labeled data.

---

## Tech Stack & Architecture

The application is structured using a modular layered architecture to ensure operational capability across distinct web and mobile platforms:

* **Presentation Layer (Web & Hybrid Mobile):** Shared responsive interface built with HTML, CSS, and JavaScript for standard web browsers and hybrid runtimes.
* **Mobile Runtime Deployments (Dual Versions):**
  * **Cross-Platform Hybrid Version:** [Capacitor](https://capacitorjs.com) wraps the core web codebase into cross-platform mobile app environments, bridging web views directly to common device hardware APIs.
  * **Native Mobile Version:** A separate mobile environment built natively in **Java (Android SDK)**. It supports cached-session app launch and locally queues identification results for later sync; assessment data operations require connectivity.
* **Backend Application Layer:** Object-Oriented PHP leveraging the Model-View-Controller (MVC) pattern for API endpoints, business logic, session management, data validation, and secure communication routing between all three client targets (Web, Capacitor, Native Java) and the data tiers.
* **AI / Deep Learning Layer:** Python-powered classification system built with **TensorFlow / Keras** for model execution and **OpenCV** for image preprocessing. Raw imagery captured from the field undergoes standardized resizing, pixel-value normalization, and programmatic lighting corrections before it is pushed through the neural network pipeline to evaluate features like texture, shape, and structure.
* **Database Layer:** Relational data storage utilizing **MySQL / MariaDB**. The schema maintains strict structural integrity across independent tables for user accounts, logged quadrat observations, historical analysis records, and dataset validation configurations.

---

## Capacitor Offline Browsing

The Capacitor app loads its HTML, styles, scripts, and images from the bundled
`www/` directory, so its pages remain browsable without an internet connection.
After changing web assets or Capacitor configuration, run `npx cap sync android`
before building or installing the Android app. API-backed features and remote
data still require a network connection, except that authenticated identification
and assessment save requests can be queued in IndexedDB for later synchronization.

## Native Manual Identification

The native Android app includes an illustrated, Indo-Pacific manual key limited
to the ten selected species. Manual results are stored with explicit
`manual_key` provenance and no fabricated confidence score. Results selected
from the wrong-prediction flow also create a linked prediction flag.

Before deploying the backend changes, run the image-path migration if it has
not already been applied, then run the manual-identification migration from the
repository root:

```sh
php core/migrations/013_identification_image_path.php
php core/migrations/014_manual_identification.php
php core/migrations/015_identification_gps_coordinates.php
```

For an existing database, importing the master SQL does not alter an already
created `identifications` table; run migration 013 to add `image_path`.
Migration 015 adds optional latitude and longitude columns. The backend image
must be rebuilt with the PHP EXIF extension (included in the Dockerfile) to
read GPS metadata from newly uploaded photos. The web app uses image GPS EXIF
when available and does not request browser location. The native Android and
Capacitor apps request camera and foreground location permission on first
launch; when an image has no GPS EXIF, they use
device coordinates only if location permission is granted. If permission is
denied or no location fix is available, coordinates remain blank. Gallery
selection uses the platform photo picker and does not request broad media or
storage access.

Attach a writable Railway volume to the PHP service. The backend stores
identification images directly in the directory Railway exposes through
`RAILWAY_VOLUME_MOUNT_PATH`; the container entrypoint grants Apache write
permission to the mounted directory. Do not deploy this change on Railway
without a mounted volume: image writes fail explicitly rather than silently
falling back to ephemeral container storage.
Locally, images use `www/public/uploads/identifications`.

## Repository Structure

---

## Academic Disclaimer
This project is an ongoing capstone project presented to the Faculty of the **IT Dept** at a **University** in partial fulfillment of the requirements for the degree of **BSIT**. 

---

## 👥 Development Team
* **Y A. M**
* **E E. S IV**
* **RI V. D P**
* **CG B. M**
