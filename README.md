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
* **Dual-Engine Mobile Availability:** Deploy field surveys on either low-overhead cross-platform builds or low-latency, device-optimized native builds.
* **Offline Recording & Synchronization:** Capture and store quadrat data in remote coastal areas without internet access, then securely sync records to the database when connectivity is restored.
* **Verification and Review:** Review, correct, or flag low-confidence AI predictions (`Unknown / For Validation`) to maintain data integrity.

> 🛠️ **Current AI Training Scope:** While the embedded reference catalog covers dozens of global species for academic study, the current iteration of the deep-learning model is **explicitly trained, tested, and validated to recognize 6 target localized seagrass species** native to the primary assessment areas. Captured imagery falling outside of these 6 core training classes will automatically trigger a lower confidence evaluation and filter into the validation queue for manual administrator review.

---

## Tech Stack & Architecture

The application is structured using a modular layered architecture to ensure operational capability across distinct web and mobile platforms:

* **Presentation Layer (Web & Hybrid Mobile):** Shared responsive interface built with HTML, CSS, and JavaScript for standard web browsers and hybrid runtimes.
* **Mobile Runtime Deployments (Dual Versions):**
  * **Cross-Platform Hybrid Version:** [Capacitor](https://capacitorjs.com) wraps the core web codebase into cross-platform mobile app environments, bridging web views directly to common device hardware APIs.
  * **Native Mobile Version:** A separate dedicated mobile environment built natively in **Java (Android SDK)** to handle optimized native screen render loops, faster camera initialization, and robust low-overhead memory layouts during extensive offline field deployments.
* **Backend Application Layer:** Object-Oriented PHP leveraging the Model-View-Controller (MVC) pattern for API endpoints, business logic, session management, data validation, and secure communication routing between all three client targets (Web, Capacitor, Native Java) and the data tiers.
* **AI / Deep Learning Layer:** Python-powered classification system built with **TensorFlow / Keras** for model execution and **OpenCV** for image preprocessing. Raw imagery captured from the field undergoes standardized resizing, pixel-value normalization, and programmatic lighting corrections before it is pushed through the neural network pipeline to evaluate features like texture, shape, and structure.
* **Database Layer:** Relational data storage utilizing **MySQL / MariaDB**. The schema maintains strict structural integrity across independent tables for user accounts, logged quadrat observations, historical analysis records, and dataset validation configurations.

---

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
