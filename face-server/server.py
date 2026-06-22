import os
import io
import base64
import numpy as np
import cv2
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from deepface import DeepFace
from pydantic import BaseModel
from typing import List
import uvicorn

MODEL_NAME = os.getenv('DEEPFACE_MODEL', 'Facenet512')
DETECTOR_BACKEND = os.getenv('DEEPFACE_DETECTOR', 'retinaface')
THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.35'))
PORT = int(os.getenv('PORT', 5005))
ANTI_SPOOFING = os.getenv('ANTI_SPOOFING', '1').lower() in ('1', 'true', 'yes')

class ImageDecodeError(Exception):
    pass

def load_image_from_base64(img_str):
    try:
        if ',' in img_str:
            img_str = img_str.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ImageDecodeError("La imagen decodificada está vacía o es inválida")
        return img
    except Exception as e:
        raise ImageDecodeError(f"Fallo al decodificar base64: {str(e)}")

def l2_normalize(embedding):
    emb = np.array(embedding, dtype=np.float64)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb.tolist()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print('Pre-cargando modelo DeepFace y detector...')
    print('  (Esto puede tomar 30-60s en la primera ejecucion)')
    print(f'  Modelo: {MODEL_NAME}, Detector: {DETECTOR_BACKEND}')
    try:
        # Usar una imagen dummy de 224x224 para asegurar que el detector y el modelo se inicialicen correctamente
        dummy = np.zeros((224, 224, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=dummy,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        print('  [OK] Modelos cargados exitosamente (reconocimiento y deteccion)')
    except Exception as e:
        print(f'  [WARN] Advertencia en warmup: {e}')
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerifyRequest(BaseModel):
    image: str
    embeddings: List[dict]

class RepresentRequest(BaseModel):
    image: str

async def _extract_image(request: Request):
    content_type = request.headers.get("content-type", "")
    
    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
            if "image" in form:
                f = form["image"]
                if hasattr(f, "read"):
                    img_bytes = await f.read()
                    arr = np.frombuffer(img_bytes, np.uint8)
                    return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            return None

    if "application/json" in content_type:
        try:
            data = await request.json()
            if data and "image" in data:
                return load_image_from_base64(data["image"])
        except Exception:
            return None

    return None

@app.post('/v1/represent')
async def represent(request: Request):
    img = await _extract_image(request)
    if img is None:
        return JSONResponse(
            status_code=400, 
            content={'error': 'No se proporcionó imagen. Envía multipart (campo "image") o JSON (campo "image" con base64).'}
        )

    try:
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        for obj in embedding_objs:
            obj['embedding'] = l2_normalize(obj['embedding'])
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real. Intenta de nuevo con mejor iluminación.'})
        return JSONResponse(status_code=422, content={'error': f'No se detectó un rostro en la imagen: {msg}'})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error al procesar la imagen: {str(e)}'})

    result = embedding_objs[0]
    return JSONResponse(content={
        'embedding': result['embedding'],
        'facial_area': result.get('facial_area'),
        'face_confidence': result.get('face_confidence'),
        'model': MODEL_NAME,
        'dimensions': len(result['embedding']),
    })


@app.post('/v1/verify')
async def verify(data: VerifyRequest):
    image_input_str = data.image
    stored_embeddings = data.embeddings

    if not image_input_str:
        return JSONResponse(status_code=400, content={'error': 'Campo "image" requerido'})
    if not stored_embeddings:
        return JSONResponse(status_code=400, content={'error': 'Campo "embeddings" requerido'})
    if len(stored_embeddings) > 1000:
        return JSONResponse(status_code=400, content={'error': 'Superado el límite de 1000 embeddings por solicitud'})
        
    for s in stored_embeddings:
        if not isinstance(s, dict) or 'id' not in s or 'embedding' not in s:
            return JSONResponse(status_code=400, content={'error': 'Estructura de embeddings inválida. Falta id o embedding'})

    try:
        image_input = load_image_from_base64(image_input_str)
        if image_input is None:
            return JSONResponse(status_code=400, content={'error': 'No se pudo decodificar la imagen'})
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': f'Error decodificando base64: {str(e)}'})

    try:
        embedding_objs = DeepFace.represent(
            img_path=image_input,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        for obj in embedding_objs:
            obj['embedding'] = l2_normalize(obj['embedding'])
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real. Intenta de nuevo con mejor iluminación.'})
        return JSONResponse(status_code=422, content={'error': 'No se detectó un rostro en la imagen'})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error al procesar: {str(e)}'})

    verification_emb = np.array(embedding_objs[0]['embedding'], dtype=np.float64)
    expected_dim = len(verification_emb)

    for s in stored_embeddings:
        if len(s['embedding']) != expected_dim:
            return JSONResponse(status_code=400, content={
                'error': f'Dimensión de embedding incorrecta: se esperaban {expected_dim}, '
                         f'perfil "{s["id"]}" tiene {len(s["embedding"])}. '
                         f'Vuelve a registrar el perfil con el servidor actual.'
            })

    matches = []
    for stored in stored_embeddings:
        stored_emb = np.array(stored['embedding'], dtype=np.float64)

        dot = np.dot(verification_emb, stored_emb)
        norm_v = np.linalg.norm(verification_emb)
        norm_s = np.linalg.norm(stored_emb)

        if norm_v == 0 or norm_s == 0:
            distance = 1.0
        else:
            distance = 1.0 - (dot / (norm_v * norm_s))

        confidence = round(max(0.0, min(100.0, (1.0 - distance) * 100.0)), 2)

        matches.append({
            'id': stored['id'],
            'distance': round(float(distance), 6),
            'confidence': confidence,
        })

    matches.sort(key=lambda x: x['distance'])
    best = matches[0] if matches else None

    return JSONResponse(content={
        'matches': matches,
        'best_match': best,
        'verified': best is not None and best['distance'] <= THRESHOLD,
        'threshold': THRESHOLD,
    })


@app.get('/v1/health')
async def health():
    return JSONResponse(content={'status': 'ok', 'model': MODEL_NAME, 'detector': DETECTOR_BACKEND})


if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)

    print()
    print('============================================')
    print('|        GeoFace - Servidor DeepFace       |')
    print('============================================')
    print()
    print(f'  Modelo: {MODEL_NAME}')
    print(f'  Detector: {DETECTOR_BACKEND}')
    print(f'  Umbral de coincidencia: {THRESHOLD}')
    print(f'  Anti-Spoofing (Vitalidad): {"Activado" if ANTI_SPOOFING else "Desactivado"}')
    print(f'  Puerto: {PORT}')
    print()
    print(f'  [OK] Servidor listo en http://0.0.0.0:{PORT}')
    print()

    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)
