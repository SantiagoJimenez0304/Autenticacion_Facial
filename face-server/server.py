import os
import io
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace

app = Flask(__name__)
CORS(app)

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


@app.route('/v1/represent', methods=['POST'])
def represent():
    img = _extract_image(request)
    if img is None:
        return jsonify({'error': 'No se proporcionó imagen. Envía multipart (campo "image") o JSON (campo "image" con base64).'}), 400

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
            return jsonify({'error': 'Anti-spoofing: No se detectó una persona real. Intenta de nuevo con mejor iluminación.'}), 403
        return jsonify({'error': f'No se detectó un rostro en la imagen: {msg}'}), 422
    except Exception as e:
        return jsonify({'error': f'Error al procesar la imagen: {str(e)}'}), 500

    result = embedding_objs[0]
    return jsonify({
        'embedding': result['embedding'],
        'facial_area': result.get('facial_area'),
        'face_confidence': result.get('face_confidence'),
        'model': MODEL_NAME,
        'dimensions': len(result['embedding']),
    })


@app.route('/v1/verify', methods=['POST'])
def verify():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Solicitud debe ser JSON'}), 400

    image_input_str = data.get('image')
    stored_embeddings = data.get('embeddings', [])

    if not image_input_str:
        return jsonify({'error': 'Campo "image" requerido'}), 400
    if not stored_embeddings:
        return jsonify({'error': 'Campo "embeddings" requerido'}), 400
    if len(stored_embeddings) > 1000:
        return jsonify({'error': 'Superado el límite de 1000 embeddings por solicitud'}), 400
        
    for s in stored_embeddings:
        if not isinstance(s, dict) or 'id' not in s or 'embedding' not in s:
            return jsonify({'error': 'Estructura de embeddings inválida. Falta id o embedding'}), 400

    try:
        image_input = load_image_from_base64(image_input_str)
        if image_input is None:
            return jsonify({'error': 'No se pudo decodificar la imagen'}), 400
    except Exception as e:
        return jsonify({'error': f'Error decodificando base64: {str(e)}'}), 400

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
            return jsonify({'error': 'Anti-spoofing: No se detectó una persona real. Intenta de nuevo con mejor iluminación.'}), 403
        return jsonify({'error': 'No se detectó un rostro en la imagen'}), 422
    except Exception as e:
        return jsonify({'error': f'Error al procesar: {str(e)}'}), 500

    verification_emb = np.array(embedding_objs[0]['embedding'], dtype=np.float64)
    expected_dim = len(verification_emb)

    for s in stored_embeddings:
        if len(s['embedding']) != expected_dim:
            return jsonify({
                'error': f'Dimensión de embedding incorrecta: se esperaban {expected_dim}, '
                         f'perfil "{s["id"]}" tiene {len(s["embedding"])}. '
                         f'Vuelve a registrar el perfil con el servidor actual.'
            }), 400

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

    return jsonify({
        'matches': matches,
        'best_match': best,
        'verified': best is not None and best['distance'] <= THRESHOLD,
        'threshold': THRESHOLD,
    })


@app.route('/v1/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': MODEL_NAME, 'detector': DETECTOR_BACKEND})


def _extract_image(request):
    if 'image' in request.files:
        f = request.files['image']
        img_bytes = f.read()
        arr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    data = request.get_json(silent=True)
    if data and 'image' in data:
        try:
            return load_image_from_base64(data['image'])
        except Exception:
            return None

    return None


def _warmup():
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

    _warmup()

    print()
    print(f'  [OK] Servidor listo en http://0.0.0.0:{PORT}')
    print()

    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)
