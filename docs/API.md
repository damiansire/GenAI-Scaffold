# 📡 Documentación de la API

Esta documentación describe la API REST del AI Gateway, incluyendo endpoints, autenticación, y ejemplos de uso.

## 🔐 Autenticación

### API Key Authentication

Todas las rutas de la API requieren autenticación mediante API Key en el header `X-API-Key`.

```bash
curl -H "X-API-Key: your-api-key-here" \
     http://localhost:3000/api/models
```

### Configuración de API Keys

Las API keys se configuran en el archivo `.env`:

```bash
# API Keys específicas
API_KEY_1=key1:read,write
API_KEY_2=key2:read
API_KEY_3=admin-key:read,write,admin

# API Key por defecto
DEFAULT_API_KEY=default-key-change-in-production
```

**Formato:** `key:permisos` donde permisos pueden ser:

- `read`: Solo lectura
- `write`: Lectura y escritura
- `admin`: Acceso completo

## 🌐 Endpoints Base

### Health Check

```http
GET /health
```

**Respuesta:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "registeredModels": ["google-text-bison", "google-vision-ocr"],
  "registeredSchemas": ["google-text-bison", "google-vision-ocr"]
}
```

### API Info

```http
GET /api/info
```

**Respuesta:**

```json
{
  "name": "AI Gateway API",
  "version": "1.0.0",
  "description": "Multimodal AI Gateway with plugin architecture",
  "availableModels": ["google-text-bison", "google-vision-ocr"],
  "totalModels": 2
}
```

## 🤖 Modelos de IA

### Listar Modelos Disponibles

```http
GET /api/models
```

**Headers:**

```
X-API-Key: your-api-key-here
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "modelId": "google-text-bison",
        "description": "Google Text Bison model for text generation",
        "available": true
      },
      {
        "modelId": "google-vision-ocr",
        "description": "Google Vision OCR model for extracting text from images",
        "available": true
      }
    ],
    "total": 2
  }
}
```

### Información de un Modelo Específico

```http
GET /api/models/{modelId}
```

**Ejemplo:**

```bash
curl -H "X-API-Key: your-api-key" \
     http://localhost:3000/api/models/google-text-bison
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "modelId": "google-text-bison",
    "description": "Google Text Bison model for text generation. Simulates API calls.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "The text prompt to generate a response from.",
          "minLength": 1,
          "maxLength": 8192
        },
        "maxTokens": {
          "type": "number",
          "minimum": 1,
          "maximum": 1024,
          "default": 256
        }
      },
      "required": ["prompt"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "text": { "type": "string" },
        "finishReason": { "type": "string" },
        "usage": {
          "type": "object",
          "properties": {
            "promptTokens": { "type": "number" },
            "completionTokens": { "type": "number" },
            "totalTokens": { "type": "number" }
          }
        }
      }
    }
  }
}
```

### Invocar un Modelo

```http
POST /api/models/{modelId}/invoke
```

**Headers:**

```
X-API-Key: your-api-key-here
Content-Type: application/json
```

## 📝 Modelo de Texto (Google Text Bison)

### Endpoint

```http
POST /api/models/google-text-bison/invoke
```

### Parámetros de Entrada

```json
{
  "prompt": "Escribe un poema sobre la inteligencia artificial",
  "maxTokens": 256,
  "temperature": 0.7,
  "topP": 0.9,
  "topK": 40,
  "stopSequences": ["FIN", "END"]
}
```

### Parámetros Opcionales

| Parámetro       | Tipo   | Descripción                                             | Valor por defecto | Rango    |
| --------------- | ------ | ------------------------------------------------------- | ----------------- | -------- |
| `maxTokens`     | number | Máximo número de tokens a generar                       | 256               | 1-1024   |
| `temperature`   | number | Controla la aleatoriedad (0=determinístico, 1=creativo) | 0.7               | 0.0-1.0  |
| `topP`          | number | Probabilidad acumulativa máxima para sampling           | 0.9               | 0.0-1.0  |
| `topK`          | number | Máximo número de tokens a considerar para sampling      | 40                | 1-100    |
| `stopSequences` | array  | Secuencias que detienen la generación                   | null              | Máximo 5 |

### Ejemplo de Uso

```bash
curl -X POST http://localhost:3000/api/models/google-text-bison/invoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explica qué es la inteligencia artificial en términos simples",
    "maxTokens": 150,
    "temperature": 0.5
  }'
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "text": "La inteligencia artificial (IA) es una tecnología que permite a las máquinas realizar tareas que normalmente requieren inteligencia humana, como reconocer patrones, aprender de la experiencia y tomar decisiones.",
    "finishReason": "STOP",
    "usage": {
      "promptTokens": 25,
      "completionTokens": 45,
      "totalTokens": 70
    }
  },
  "metadata": {
    "modelId": "google-text-bison",
    "processingTime": 1250,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🖼️ Modelo de Imagen (Google Vision OCR)

### Endpoint

```http
POST /api/models/google-vision-ocr/invoke
```

### Formato de Entrada

**Content-Type:** `multipart/form-data`

### Parámetros de Entrada

| Parámetro              | Tipo    | Descripción                           | Valor por defecto |
| ---------------------- | ------- | ------------------------------------- | ----------------- |
| `imageFile`            | file    | Archivo de imagen (requerido)         | -                 |
| `language`             | string  | Idioma para OCR (ej: "en", "es")      | "en"              |
| `maxResults`           | number  | Máximo número de resultados           | 10                |
| `confidenceThreshold`  | number  | Umbral mínimo de confianza            | 0.8               |
| `includeBoundingBoxes` | boolean | Incluir coordenadas de bounding boxes | true              |
| `outputFormat`         | string  | Formato de salida                     | "structured"      |

### Tipos de Archivo Soportados

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/bmp`

### Tamaño Máximo

- 10 MB por archivo

### Ejemplo de Uso

```bash
curl -X POST http://localhost:3000/api/models/google-vision-ocr/invoke \
  -H "X-API-Key: your-api-key" \
  -F "imageFile=@/path/to/image.jpg" \
  -F "language=en" \
  -F "confidenceThreshold=0.8" \
  -F "includeBoundingBoxes=true"
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "text": "Extracted text from image: image.jpg. This is a simulated OCR result.",
    "annotations": [
      {
        "text": "Hello World",
        "confidence": 0.95,
        "boundingBox": {
          "x": 10,
          "y": 10,
          "width": 100,
          "height": 20
        },
        "language": "en"
      },
      {
        "text": "OCR Demo",
        "confidence": 0.88,
        "boundingBox": {
          "x": 120,
          "y": 30,
          "width": 80,
          "height": 15
        },
        "language": "en"
      }
    ],
    "language": "en",
    "confidence": 0.915,
    "imageInfo": {
      "width": 800,
      "height": 600,
      "format": "JPEG",
      "size": 245760
    },
    "processingTime": 1500
  },
  "metadata": {
    "modelId": "google-vision-ocr",
    "processingTime": 1500,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "imageProcessed": true,
    "originalFileName": "image.jpg",
    "fileSize": 245760
  }
}
```

---

## 🎨 Gemini Image Generation (Nano Banana)

### Endpoint

```http
POST /api/models/gemini-image-gen/invoke
```

### Descripción

Genera y edita imágenes usando Gemini 2.5 Flash Image. Soporta múltiples modos:

- **Text-to-Image**: Generación desde descripciones de texto
- **Image Editing**: Modificación de imágenes existentes
- **Style Transfer**: Transferencia de estilos artísticos
- **Multi-Image Composition**: Composición de múltiples imágenes

### Headers Requeridos

```http
X-API-Key: your-api-key
Content-Type: application/json
```

### Parámetros del Body

| Parámetro            | Tipo   | Requerido | Descripción                                                    |
| -------------------- | ------ | --------- | -------------------------------------------------------------- |
| `prompt`             | string | Sí        | Descripción detallada de la imagen a generar o editar          |
| `aspectRatio`        | string | No        | Ratio de aspecto: `1:1`, `16:9`, `9:16`, etc. (default: `1:1`) |
| `responseModalities` | array  | No        | Modalidades de salida: `["Image", "Text"]`                     |
| `inputImages`        | array  | No        | Imágenes de entrada para edición (base64)                      |

### Aspect Ratios Disponibles

| Ratio  | Resolución | Uso Típico                |
| ------ | ---------- | ------------------------- |
| `1:1`  | 1024×1024  | Square, Social Media      |
| `16:9` | 1344×768   | Widescreen, Presentations |
| `9:16` | 768×1344   | Mobile, Stories           |
| `4:3`  | 1184×864   | Classic Photos            |
| `3:2`  | 1248×832   | Photography               |
| `21:9` | 1536×672   | Ultrawide, Cinematic      |

### Ejemplo 1: Text-to-Image (Generación Simple)

```bash
curl -X POST http://localhost:3000/api/models/gemini-image-gen/invoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A photorealistic portrait of an elderly Japanese ceramicist with deep wrinkles and a warm smile, inspecting a freshly glazed tea bowl. Soft golden hour light, 85mm lens with bokeh.",
    "aspectRatio": "3:2",
    "responseModalities": ["Image", "Text"]
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "result": {
      "images": [
        {
          "data": "iVBORw0KGgoAAAANSUhEUg...", // base64 image data
          "mimeType": "image/png"
        }
      ],
      "text": "A serene portrait capturing the wisdom and craftsmanship..."
    },
    "metadata": {
      "processingTime": 2500,
      "modelVersion": "gemini-2.5-flash-image",
      "apiProvider": "Google Gemini",
      "aspectRatio": "3:2",
      "mode": "text-to-image",
      "imagesGenerated": 1
    }
  },
  "metadata": {
    "modelId": "gemini-image-gen",
    "processingTime": 2500,
    "timestamp": "2025-10-11T10:30:00.000Z"
  }
}
```

### Ejemplo 2: Image Editing (Con Imagen de Entrada)

```bash
curl -X POST http://localhost:3000/api/models/gemini-image-gen/invoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a small knitted wizard hat on the cat'\''s head. Make it look comfortable and not falling off.",
    "aspectRatio": "1:1",
    "inputImages": [
      {
        "data": "/9j/4AAQSkZJRgABAQEA...",
        "mimeType": "image/jpeg"
      }
    ]
  }'
```

### Ejemplo 3: Logo con Texto de Alta Fidelidad

```bash
curl -X POST http://localhost:3000/api/models/gemini-image-gen/invoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a modern minimalist logo for a coffee shop called \"The Daily Grind\". Clean bold sans-serif font with a stylized coffee bean icon integrated with the text. Black and white.",
    "aspectRatio": "1:1",
    "responseModalities": ["Image"]
  }'
```

### Prompts de Ejemplo por Categoría

**Photorealistic:**

```
A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh).
```

**Illustration/Sticker:**

```
A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It's munching on a green bamboo leaf. The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white.
```

**Product Photography:**

```
A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug in matte black, presented on a polished concrete surface. The lighting is a three-point softbox setup designed to create soft, diffused highlights. The camera angle is a slightly elevated 45-degree shot. Ultra-realistic, with sharp focus on the steam rising from the coffee.
```

**Comic/Sequential Art:**

```
A single comic book panel in a gritty, noir art style with high-contrast black and white inks. In the foreground, a detective in a trench coat stands under a flickering streetlamp, rain soaking his shoulders. In the background, the neon sign of a desolate bar reflects in a puddle. A caption box at the top reads "The city was a tough place to keep secrets."
```

### Mejores Prácticas de Prompts

1. **Sé Hiper-Específico**: Más detalles = más control

   - ❌ "fantasy armor"
   - ✅ "ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings"

2. **Proporciona Contexto**: Explica el propósito

   - ✅ "Create a logo for a high-end, minimalist skincare brand"

3. **Itera y Refina**: Usa el modo conversacional

   - "That's great, but can you make the lighting a bit warmer?"
   - "Keep everything the same, but change the character's expression to be more serious."

4. **Instrucciones Paso a Paso**: Para escenas complejas

   - "First, create a background of a serene, misty forest at dawn. Then, in the foreground, add a moss-covered ancient stone altar. Finally, place a single, glowing sword on top of the altar."

5. **Controla la Cámara**: Usa términos fotográficos
   - wide-angle shot, macro shot, low-angle perspective, 85mm portrait lens, bokeh

### Limitaciones

- Funciona mejor con hasta 3 imágenes de entrada
- Idiomas recomendados: EN, es-MX, ja-JP, zh-CN, hi-IN
- No soporta audio o video como entrada
- Todas las imágenes incluyen marca de agua SynthID

---

## ⚠️ Códigos de Error

### Errores de Autenticación

```json
{
  "error": {
    "name": "ApiError",
    "message": "API Key is required.",
    "statusCode": 401,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/api/models",
    "method": "GET"
  }
}
```

### Errores de Validación

```json
{
  "error": {
    "name": "ApiError",
    "message": "Request body validation failed",
    "statusCode": 422,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "details": [
      {
        "field": "prompt",
        "message": "must be a string",
        "value": null,
        "keyword": "type"
      }
    ]
  }
}
```

### Errores del Modelo

```json
{
  "error": {
    "name": "ApiError",
    "message": "Model 'invalid-model' not found.",
    "statusCode": 404,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/api/models/invalid-model/invoke",
    "method": "POST"
  }
}
```

## 🔍 Ejemplos de Uso

### JavaScript/Node.js

```javascript
const axios = require("axios");

const apiKey = "your-api-key-here";
const baseURL = "http://localhost:3000/api";

// Invocar modelo de texto
async function generateText(prompt) {
  try {
    const response = await axios.post(
      `${baseURL}/models/google-text-bison/invoke`,
      {
        prompt: prompt,
        maxTokens: 256,
        temperature: 0.7,
      },
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error:", error.response.data);
    throw error;
  }
}

// Invocar modelo de imagen
async function processImage(imageFile) {
  try {
    const formData = new FormData();
    formData.append("imageFile", imageFile);
    formData.append("language", "en");
    formData.append("confidenceThreshold", "0.8");

    const response = await axios.post(
      `${baseURL}/models/google-vision-ocr/invoke`,
      formData,
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error:", error.response.data);
    throw error;
  }
}
```

### Python

```python
import requests
import json

API_KEY = 'your-api-key-here'
BASE_URL = 'http://localhost:3000/api'

def generate_text(prompt):
    url = f"{BASE_URL}/models/google-text-bison/invoke"
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    data = {
        'prompt': prompt,
        'maxTokens': 256,
        'temperature': 0.7
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def process_image(image_file_path):
    url = f"{BASE_URL}/models/google-vision-ocr/invoke"
    headers = {'X-API-Key': API_KEY}

    with open(image_file_path, 'rb') as f:
        files = {'imageFile': f}
        data = {
            'language': 'en',
            'confidenceThreshold': '0.8'
        }

        response = requests.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        return response.json()

# Uso
text_result = generate_text("Escribe un haiku sobre la tecnología")
print(text_result['data']['text'])

image_result = process_image('image.jpg')
print(image_result['data']['text'])
```

### cURL

```bash
# Generar texto
curl -X POST http://localhost:3000/api/models/google-text-bison/invoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explica la diferencia entre IA y machine learning",
    "maxTokens": 200,
    "temperature": 0.6
  }'

# Procesar imagen
curl -X POST http://localhost:3000/api/models/google-vision-ocr/invoke \
  -H "X-API-Key: your-api-key" \
  -F "imageFile=@document.jpg" \
  -F "language=es" \
  -F "confidenceThreshold=0.9"
```

## 📊 Límites y Cuotas

### Límites por Request

- **Texto**: Máximo 8192 caracteres en el prompt
- **Imagen**: Máximo 10 MB por archivo
- **Tokens**: Máximo 1024 tokens por respuesta
- **Rate Limit**: 100 requests por minuto por API key

### Timeouts

- **Request Timeout**: 30 segundos
- **Processing Timeout**: 60 segundos
- **Connection Timeout**: 10 segundos

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8080

# Configuración de API Keys
API_KEY_1=key1:read,write
API_KEY_2=key2:read
DEFAULT_API_KEY=default-key

# Configuración de Gemini
GEMINI_API_KEY=your-gemini-api-key
```

### Logs

Los logs se almacenan en:

- **Desarrollo**: Consola
- **Producción**: `./logs/` (volumen Docker)

### Monitoreo

- **Health Check**: `/health`
- **Métricas**: Disponibles en logs
- **Trazas**: Incluidas en respuestas de error

---

¿Necesitas más información sobre algún endpoint específico? Revisa los ejemplos o crea un issue en el repositorio.
