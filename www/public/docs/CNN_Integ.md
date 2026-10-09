# CREYNet Integration Guide

**iSeeGrass — CNN to Core System Integration**

This document records the verified architecture, file paths, integration plan, and design decisions for connecting the CREYNet deep learning pipeline into the iSeeGrass PHP backend and frontend.

---

## 1. What We Have

### Model Files (Local)

| File | Location | Purpose |
|---|---|---|
| `CREYNet_v0.02.keras` | `/media/codex/Shared/iSeeGrass_CNN/` | Primary local weights (Keras full model) |
| `CREYNet_v0.02.tflite` | `/media/codex/Shared/iSeeGrass_CNN/` | Lightweight TFLite version (faster CPU inference) |
| `model.keras` | `/media/codex/Shared/iSeeGrass_CNN/` | 3-class baseline (Kaggle working copy) |

The `.keras` file is the authoritative model used for inference. The `.tflite` version was converted from it using `convert_tflite.py` as a faster runtime alternative.

### Inference Scripts (Local)

| Script | Purpose |
|---|---|
| `local_predict.py` | Full Keras inference — loads `.keras`, runs VGG16 preprocessing, prints results |
| `local_predict_tflite.py` | TFLite inference — faster, no full Keras load, manual mean-channel subtraction |
| `local_heatmap.py` | Grad-CAM heatmap visualization (for debugging/evaluation use) |
| `convert_tflite.py` | One-time conversion from `.keras` → `.tflite` |

---

## 2. Current Model Taxonomy (3-Class + Background)

The current model has **4 output nodes** (index 0–3):

| Index | Label | Source Dataset Folder |
|---|---|---|
| 0 | Background Substrate | Non-vegetation (background) |
| 1 | Halophila spinulosa | `Ferny/` |
| 2 | Cymodocea rotundata | `Rounded/` |
| 3 | Halodule pinifolia | `Strappy/` |

> **Note:** The output layer is `Dense(4, activation='softmax')` — 4 nodes, not 3. "3-class" refers to 3 seagrass species + 1 background class.

---

## 3. Future Expansion Target (6-Species)

When the model is retrained and expanded, the output layer becomes `Dense(6, activation='softmax')` with this exact class ordering:

| Index | Label | Category |
|---|---|---|
| 0 | Halophila spinulosa | Ferny Full |
| 1 | Halophila decipiens | Ferny Sub |
| 2 | Halophila ovalis | Rounded Oval |
| 3 | Cymodocea rotundata | Rounded Pure |
| 4 | Enhalus acoroides | Strappy Long |
| 5 | Halodule pinifolia | Strappy Short |

> **Do not implement 6-class logic yet.** This section is recorded for future planning only. The current backend and database should use the 4-class layout above.

---

## 4. Production Environment Notes

### Python Environment

CREYNet inference runs inside a dedicated virtual environment on the local machine:

```bash
# Activate
source ~/ml_env/bin/activate

# Deactivate
deactivate
```

### NumPy 2.x Compatibility Patch

NumPy 2.0+ removed `np.sctypes`. Packages like `imgaug` that depend on it will crash with:

```
AttributeError: module 'numpy.dtypes' has no attribute 'StringDType'
```

**Fix:** Inject this patch at the top of any Python script that imports TensorFlow/Keras, **before** those imports:

```python
import numpy as np

if not hasattr(np, "sctypes"):
    np.sctypes = {
        'int':   [np.int8, np.int16, np.int32, np.int64],
        'uint':  [np.uint8, np.uint16, np.uint32, np.uint64],
        'float': [np.float16, np.float32, np.float64],
        'others': [bool, complex, str, object]
    }
```

This is already applied in both `local_predict.py` and `local_predict_tflite.py`.

### TensorFlow Log Suppression

Set this environment variable to silence TensorFlow's verbose CPU/GPU initialization messages:

```bash
export TF_CPP_MIN_LOG_LEVEL=3
```

Or inline before running a script:

```bash
TF_CPP_MIN_LOG_LEVEL=3 python local_predict.py --image test.jpg
```

---

## 5. Integration Architecture

The goal is to let the PHP backend trigger CREYNet inference when a user submits an image from the Identification page.

### How it works

```
Frontend (identify.html)
    │
    │  POST /api/identify  (multipart/form-data, image file)
    ▼
PHP API endpoint (core/api/identify.php)
    │
    │  Saves image to temp path
    │  Calls Python script via shell_exec()
    │  Reads stdout (JSON result)
    ▼
Python inference script (predict_api.py)
    │
    │  Loads CREYNet_v0.02.keras (or .tflite)
    │  Preprocesses image
    │  Returns JSON to stdout
    ▼
PHP returns JSON response to frontend
    │
    ▼
Frontend displays: identified species, confidence scores
```

> PHP calls Python using `shell_exec()` or `proc_open()`. The Python script is not a web server — it is a command-line tool that PHP spawns per request.

---

## 6. The PHP-to-Python Bridge

### Why `shell_exec`?

The backend is plain PHP without a job queue or background worker. For this academic project, calling Python directly from PHP via `shell_exec()` is acceptable.

- `shell_exec()` runs the command and returns the complete output as a string
- We will have Python print a JSON string to stdout
- PHP reads that string and decodes it with `json_decode()`

### Concerns to keep in mind

- **Latency:** Loading the Keras model on every request is slow (~2–5 seconds). The TFLite version is faster. This is acceptable for an academic project.
- **Security:** The image path passed to Python must never be user-controlled raw input — PHP must control the temp path.
- **Server support:** `shell_exec()` must be enabled in `php.ini` and the web server user must have permission to execute Python.

---

## 7. Files to Create

### 7a. `predict_api.py` — API-Mode Inference Script

This is a new script (different from `local_predict.py`) designed to be called by PHP. Instead of printing a human-readable report, it prints a **single JSON object** to stdout.

**Planned location:** `/media/codex/Shared/iSeeGrass_CNN/predict_api.py`

**Behaviour:**
- Accepts `--image` (required) and `--model` (optional, defaults to `CREYNet_v0.02.keras`)
- Prints one JSON object to stdout:

```json
{
  "success": true,
  "predicted_class": "Halophila spinulosa",
  "predicted_index": 1,
  "scores": [
    { "index": 0, "label": "Background Substrate", "confidence": 0.0123 },
    { "index": 1, "label": "Halophila spinulosa",  "confidence": 0.9412 },
    { "index": 2, "label": "Cymodocea rotundata",  "confidence": 0.0301 },
    { "index": 3, "label": "Halodule pinifolia",   "confidence": 0.0164 }
  ]
}
```

- On error, prints:

```json
{ "success": false, "error": "description of what went wrong" }
```

- Uses `TF_CPP_MIN_LOG_LEVEL=3` internally (or PHP sets it before calling)
- Includes the NumPy patch
- Uses TFLite for speed (can swap to `.keras` by changing `--model`)

### 7b. `core/api/identify.php` — PHP API Endpoint

Accepts `POST` with a multipart image upload, saves it to a secure temp location, calls `predict_api.py`, returns the JSON result to the frontend.

**Planned location:** `/media/codex/Shared/iSeeGrass/core/api/identify.php`

### 7c. Frontend JS — `script-users-identify.js`

Handles:
- Sending the image from the 75% identification area to the API
- Displaying the results (species name, confidence bar or percentages)
- Handling loading/error states

**Planned location:** `www/public/js/users/identify/script-users-identify.js`

---

## 8. Image Preprocessing Specification

This must match exactly what the model was trained with. Any mismatch degrades accuracy.

| Step | Value |
|---|---|
| Resize target | 260 × 289 pixels (width × height) |
| Channel order | RGB (convert from BGR after cv2.imread) |
| Preprocessing | VGG16 mean subtraction: R −123.68, G −116.78, B −103.94 |
| Input dtype | `float32` |
| Input shape | `(1, 289, 260, 3)` — batch of 1 |

The `preprocess_input` from `tensorflow.keras.applications.vgg16` applies the mean subtraction automatically. The TFLite script does it manually with the same values.

---

## 9. Next Steps (In Order)

1. **Write `predict_api.py`** — the JSON-output Python script that PHP will call
2. **Write `core/api/identify.php`** — the PHP endpoint that receives the image, calls Python, returns JSON
3. **Test the PHP → Python bridge** on the local XAMPP/LAMPP server
4. **Write the frontend JS** to POST the image and display the result on `identify.html`
5. **Wire up Identification History** — save result to database after a successful identification (logged-in user only)
6. **Guest path** — same API call, but PHP skips the database save step

---

## 10. Open Questions / Decisions Needed

| # | Question | Status |
|---|---|---|
| 1 | Use `.keras` or `.tflite` for the production inference script? | TFLite preferred (faster), but needs Flex delegates on the server. Decide based on server test. |
| 2 | Where does the model file live on the web server? | Must be outside the web root (not publicly accessible). Path TBD. |
| 3 | Is `shell_exec()` enabled on the XAMPP/LAMPP install? | Needs verification before `identify.php` can be tested. |
| 4 | What happens when CREYNet returns Background Substrate as top result? | UI should display "No seagrass detected" instead of showing Background Substrate as the species. Needs frontend handling. |
| 5 | How many top results to show? Only the top-1, or all 4 confidence scores? | To be decided — showing all 4 scores is more informative for research. |

---

*This document is a working draft. Update it as integration decisions are made.*
