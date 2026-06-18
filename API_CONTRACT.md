# Face Recognition API Contract

The GeoFace app interacts with a Python Flask server running DeepFace.

**Base URL:** `http://<LAN_IP>:5005`

## Endpoints

### 1. Health Check
`GET /health`
- **Response:** `{ "status": "ok" }`

### 2. Get Embedding (Represent)
`POST /v1/represent`
- **Request Body:**
  ```json
  {
    "image": "base64_encoded_image_string",
    "model_name": "Facenet512",
    "detector_backend": "opencv"
  }
  ```
- **Response:**
  ```json
  {
    "embedding": [0.12, -0.45, ...], // 512 dimensions
    "face_confidence": 0.98
  }
  ```

### 3. Verify Face
`POST /v1/verify`
- **Request Body:**
  ```json
  {
    "img1_path": "base64_encoded_image_string",
    "profiles": [
      { "id": "uuid", "embedding": [...] },
      ...
    ]
  }
  ```
- **Response:**
  ```json
  {
    "verified": true,
    "best_match": { "id": "uuid", "confidence": 95.5 },
    "results": [...]
  }
  ```