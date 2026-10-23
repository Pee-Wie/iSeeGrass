# =====================================================================
# 1. INSTALL DEPENDENCIES & INJECT LEGACY INTERFACE PATCHES
# =====================================================================
!pip install -q fastapi uvicorn nest-asyncio pillow pyngrok tensorflow

import os
import io
import uvicorn
import nest_asyncio
import numpy as np
import tensorflow as tf
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok

if not hasattr(np, "sctypes"):
    np.sctypes = {
        'int': [np.int8, np.int16, np.int32, np.int64],
        'uint': [np.uint8, np.uint16, np.uint32, np.uint64],
        'float': [np.float16, np.float32, np.float64],
        'others': [bool, complex, str, object]
    }

from tensorflow.keras.applications.vgg16 import preprocess_input

app = FastAPI(title="iSeeGrass Multi-Model Router API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =====================================================================
# 2. MOUNTED MODEL DATA MANAGEMENT
# =====================================================================
TAXONOMIES = {
    "original": ["Background", "Ferny", "Rounded", "Strappy"],
    "improved_original": ["Background Substrate", "Halophila spinulosa", "Cymodocea rotundata", "Halodule pinifolia"],
    "6_species_proto": [
        "Halophila spinulosa (Ferny Full)", "Halophila decipiens (Ferny Sub)",
        "Halophila ovalis (Rounded Oval)", "Cymodocea rotundata (Rounded Pure)",
        "Enhalus acoroides (Strappy Long)", "Halodule pinifolia (Strappy Short)"
    ]
}

# Kaggle mounts your model inside the input directory automatically
MODEL_PATH = "/kaggle/input/models/y0uiemabugat/creynet-v0-02/keras/default/1/CREYNet_v0.02.keras" # Adjust path matching your model name exactly

print(f"🧠 Loading deep learning weights profile from {MODEL_PATH}...")
shared_model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print("✅ Core model successfully loaded into Kaggle cloud memory!")

# =====================================================================
# 3. ROUTER ENDPOINT
# =====================================================================
@app.post("/predict")
async def predict(file: UploadFile = File(...), model_type: str = Form("original")):
    if model_type not in TAXONOMIES:
        raise HTTPException(status_code=400, detail="Unknown model_type selection.")
    
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize((260, 289))
    img_tensor = np.expand_dims(np.array(img), axis=0).astype(np.float32)
    preprocessed_tensor = preprocess_input(img_tensor)

    base_probs = shared_model.predict(preprocessed_tensor, verbose=0)[0]

    if model_type == "6_species_proto":
        prob_background, prob_ferny, prob_rounded, prob_strappy = float(base_probs[0]), float(base_probs[1]), float(base_probs[2]), float(base_probs[3])
        distribution = {
            "Halophila spinulosa (Ferny Full)": round(prob_ferny * 0.90 * 100, 2),
            "Halophila decipiens (Ferny Sub)": round(prob_ferny * 0.10 * 100, 2),
            "Halophila ovalis (Rounded Oval)": round(prob_rounded * 0.40 * 100, 2),
            "Cymodocea rotundata (Rounded Pure)": round(prob_rounded * 0.60 * 100, 2),
            "Enhalus acoroides (Strappy Long)": round(prob_strappy * 0.15 * 100, 2),
            "Halodule pinifolia (Strappy Short)": round(prob_strappy * 0.85 * 100, 2)
        }
        highest_species_key = max(distribution, key=distribution.get)
        highest_species_val = distribution[highest_species_key] / 100
        
        if prob_background > highest_species_val:
            verdict_name, confidence = "Background Substrate", prob_background * 100
        else:
            verdict_name, confidence = highest_species_key, highest_species_val * 100
            
        distribution["Background Substrate"] = round(prob_background * 100, 2)
        class_id = 0 if verdict_name == "Background Substrate" else (list(distribution.keys()).index(verdict_name) + 1)
    else:
        labels_list = TAXONOMIES[model_type]
        class_id = int(np.argmax(base_probs))
        verdict_name, confidence = labels_list[class_id], float(base_probs[class_id]) * 100
        distribution = {labels_list[i]: round(float(prob) * 100, 2) for i, prob in enumerate(base_probs)}

    return {
        "status": "success",
        "active_engine_track": model_type,
        "verdict": {"class_id": class_id, "species_name": verdict_name, "confidence_percentage": round(confidence, 2)},
        "all_probabilities": distribution
    }

# =====================================================================
# 🚀 BACKGROUND LIVE LOOP TUNNEL
# =====================================================================
NGROK_TOKEN = "3KUVZWEEEik1Dt3ZWpxNQoTZj4E_8DccN7pagTuPHjUGyamt"
ngrok.set_auth_token(NGROK_TOKEN)
nest_asyncio.apply()
public_url = ngrok.connect(8000)

print("\n" + "="*60)
print(f"🚀 LIVE 12-HOUR PERMANENT API LINK: {public_url.public_url}")
print("="*60 + "\n")

config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="none")
server = uvicorn.Server(config)
await server.serve()

# INFO:     Started server process [16]
# 54.3s	13	
# 54.3s	14	INFO:     Started server process [16]
# 54.3s	15	INFO:     Waiting for application startup.
# 54.3s	16	
# 54.3s	17	INFO:     Waiting for application startup.
# 54.3s	18	INFO:     Application startup complete.
# 54.3s	19	
# 54.3s	20	INFO:     Application startup complete.
# 54.3s	21	INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# 54.3s	22	
# 54.3s	23	INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# 47.6s	24	🧠 Loading deep learning weights profile from /kaggle/input/models/y0uiemabugat/creynet-v0-02/keras/default/1/CREYNet_v0.02.keras...
# 49.6s	25	✅ Core model successfully loaded into Kaggle cloud memory!
# 54.1s	26	Downloading ngrok ...
# Downloading ngrok: 0%
# Downloading ngrok: 1%
# Downloading ngrok: 2%
# Downloading ngrok: 3%
# Downloading ngrok: 4%
# Downloading ngrok: 5%
# ----------------------
# Downloading ngrok: 96%
# Downloading ngrok: 97%
# Downloading ngrok: 98%
# Downloading ngrok: 99%
# Downloading ngrok: 100%
                                                                                                    
# Installing ngrok ... 
                                                                                                    
# 54.1s	27	============================================================
# 54.1s	28	🚀 LIVE 12-HOUR PERMANENT API LINK: https://tattle-washcloth-negate.ngrok-free.dev
# 54.1s	29	============================================================
# 54.1s	30	
# 1340.2s	31	INFO:     185.27.134.40:0 - "POST /predict HTTP/1.1" 200 OK