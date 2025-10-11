# 🍌 Nano Banana - Gemini Image Generation

## Configuración Rápida

### 1. Obtén tu API Key de Gemini

1. Visita: https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Click en "Create API Key"
4. Copia la API key generada

### 2. Configura el Proyecto

Edita tu archivo `.env` (o créalo desde `env.example`):

```bash
# En /Users/personal/Desktop/GenAI-Scaffold/.env
GEMINI_API_KEY=tu-api-key-aquí
```

### 3. Reinicia el Servidor

```bash
# Ctrl+C para detener el servidor actual
npm run dev
```

## 🎨 Características

### Modos de Operación

#### 1. Text-to-Image (Generación desde Texto)

Crea imágenes desde cero usando solo descripciones de texto.

**Ejemplo:**

```
A photorealistic portrait of an elderly Japanese ceramicist with deep wrinkles
inspecting a freshly glazed tea bowl. Soft golden hour light, 85mm lens with bokeh.
```

#### 2. Image Editing (Edición con Imagen de Entrada)

Modifica imágenes existentes con instrucciones de texto.

**Ejemplo:**

- Upload una imagen de tu gato
- Prompt: "Add a small knitted wizard hat on the cat's head"

#### 3. Style Transfer (Transferencia de Estilo)

Aplica estilos artísticos a fotografías.

**Ejemplo:**

- Upload una foto de calle nocturna
- Prompt: "Transform this into Van Gogh's 'Starry Night' style with swirling brushstrokes"

#### 4. Multi-Image Composition

Combina elementos de múltiples imágenes.

**Ejemplo:**

- Upload 2 imágenes (vestido + modelo)
- Prompt: "Show the model wearing this dress in a professional fashion photo"

### Aspect Ratios Disponibles

| Ratio    | Resolución | Mejor Para              | Tokens |
| -------- | ---------- | ----------------------- | ------ |
| **1:1**  | 1024×1024  | Social media, Instagram | 1290   |
| **16:9** | 1344×768   | Presentaciones, YouTube | 1290   |
| **9:16** | 768×1344   | Stories, TikTok         | 1290   |
| **4:3**  | 1184×864   | Fotografía clásica      | 1290   |
| **3:2**  | 1248×832   | Fotografía profesional  | 1290   |
| **21:9** | 1536×672   | Cinemático, ultrawide   | 1290   |

## 📝 Guía de Prompts

### Principio Fundamental

> **Describe la escena, no solo listes keywords.**

El modelo entiende lenguaje natural profundamente. Un párrafo narrativo y descriptivo casi siempre produce mejor resultado que una lista de palabras.

### Estrategias por Tipo de Imagen

#### 🖼️ Escenas Fotorealistas

Usa términos de fotografía profesional:

```
A [shot type] of [subject] [doing action].
The setting is [location details].
Illuminated by [lighting description].
Captured with [camera/lens details], resulting in [desired effect].
The overall mood is [mood description].
```

**Ejemplo:**

```
A photorealistic close-up portrait of an elderly Japanese ceramicist with
deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting
a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop
with pottery wheels and shelves of clay pots in the background. The scene is
illuminated by soft, golden hour light streaming through a window, highlighting
the fine texture of the clay and the fabric of his apron. Captured with an 85mm
portrait lens, resulting in a soft, blurred background (bokeh). The overall mood
is serene and masterful.
```

#### 🎨 Ilustraciones y Stickers

Sé explícito sobre el estilo y solicita fondo transparente si es necesario:

```
A [style]-style sticker of [subject] [doing action].
The design features [technical details].
The background must be [background description].
```

**Ejemplo:**

```
A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat.
It's munching on a green bamboo leaf. The design features bold, clean outlines,
simple cel-shading, and a vibrant color palette. The background must be white.
```

#### 🔤 Texto Preciso en Imágenes

Primero genera el texto, luego pide la imagen con ese texto:

```
Create a [type] for [brand/purpose] called "[exact text]".
The text should be in a [font description] font.
The design should feature [visual elements].
The color scheme is [colors].
```

**Ejemplo:**

```
Create a modern, minimalist logo for a coffee shop called "The Daily Grind".
The text should be in a clean, bold, sans-serif font. The design should feature
a simple, stylized icon of a coffee bean seamlessly integrated with the text.
The color scheme is black and white.
```

#### 📦 Fotografía de Producto

Perfecto para e-commerce y publicidad:

```
A high-resolution, studio-lit product photograph of [product description],
presented on [surface]. The lighting is [lighting setup] designed to
[lighting goal]. The camera angle is [angle description] to showcase
[feature to highlight]. [Additional details].
```

#### 🎭 Arte Secuencial (Cómics)

```
A single comic book panel in a [art style] with [visual characteristics].
In the foreground, [foreground description]. In the background,
[background description]. A caption box at the top reads "[exact caption]".
The lighting is [lighting description], creating a [mood] mood. [Orientation].
```

### Mejores Prácticas

#### ✅ DO's (Hacer)

1. **Sé Hiper-Específico**

   - ✅ "ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings"
   - ❌ "fantasy armor"

2. **Proporciona Contexto e Intención**

   - ✅ "Create a logo for a high-end, minimalist skincare brand"
   - ❌ "Create a logo"

3. **Itera y Refina**

   - "That's great, but can you make the lighting a bit warmer?"
   - "Keep everything the same, but change the character's expression to be more serious."

4. **Usa Instrucciones Paso a Paso** (para escenas complejas)

   - "First, create a background of a serene, misty forest at dawn. Then, in the foreground, add a moss-covered ancient stone altar. Finally, place a single, glowing sword on top of the altar."

5. **Controla la Cámara** (para fotorrealismo)
   - wide-angle shot, macro shot, low-angle perspective
   - 85mm portrait lens, 24mm wide-angle lens
   - bokeh, shallow depth of field, tack sharp focus

#### ❌ DON'Ts (Evitar)

1. **Negativos Directos**

   - ❌ "no cars"
   - ✅ "an empty, deserted street with no signs of traffic"

2. **Listas de Keywords**

   - ❌ "sunset, beach, palm trees, romantic"
   - ✅ "A romantic beach scene at sunset with silhouetted palm trees swaying gently in the warm breeze"

3. **Prompts Vagos**
   - ❌ "make it cool"
   - ✅ "add dramatic neon lighting in cyan and magenta tones, creating a cyberpunk atmosphere"

## 🚀 Uso en la Aplicación

### Interfaz Web

1. Navega a **Image Generation** en el menú superior
2. Selecciona un prompt de ejemplo o escribe el tuyo
3. (Opcional) Upload una imagen para edición
4. Selecciona el aspect ratio deseado
5. Click en "Generate Image"
6. Descarga el resultado con el botón 💾 Download

### API REST

```javascript
const response = await fetch(
  "http://localhost:3000/api/models/gemini-image-gen/invoke",
  {
    method: "POST",
    headers: {
      "X-API-Key": "your-api-key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "A beautiful sunset over mountains with dramatic clouds",
      aspectRatio: "16:9",
      responseModalities: ["Image", "Text"],
    }),
  }
);

const data = await response.json();
const imageBase64 = data.data.result.images[0].data;
const imageUrl = `data:image/png;base64,${imageBase64}`;
```

## 🎯 Casos de Uso

### Marketing y Publicidad

- Hero images para landing pages
- Product mockups profesionales
- Banners para redes sociales
- Anuncios visuales

### Diseño de Marca

- Logos y identidad de marca
- Iconos personalizados
- Ilustraciones para branding
- Stickers y emojis custom

### Contenido Editorial

- Ilustraciones para artículos
- Portadas de libros y ebooks
- Gráficos para presentaciones
- Arte conceptual

### E-commerce

- Fotos de producto
- Lifestyle shots
- Mockups de ropa y accesorios
- Imágenes de catálogo

### Arte y Creatividad

- Concept art
- Storyboards
- Character design
- Cómics y novelas gráficas

## 💡 Tips Profesionales

### Para Fotorrealismo Extremo

- Menciona tipo de cámara y lente (85mm, 24mm, etc.)
- Describe el lighting setup (golden hour, three-point, softbox)
- Especifica la profundidad de campo (bokeh, tack sharp)
- Incluye detalles de textura y materiales

### Para Logos y Tipografía

- Genera el texto primero, luego pide la imagen
- Especifica el estilo de fuente descriptivamente
- Usa "clean", "bold", "minimalist" para estilos modernos
- Define esquema de colores claramente

### Para Edición Precisa

- Describe en detalle qué debe mantenerse sin cambios
- Usa "change only [specific element]"
- Especifica "keep the rest unchanged"
- Sé claro sobre la preservación de características faciales

## 🔧 Troubleshooting

### Error: "GEMINI_API_KEY is not configured"

**Solución:**

1. Asegúrate de tener un archivo `.env` en la raíz del proyecto
2. Verifica que `GEMINI_API_KEY` esté configurado correctamente
3. Reinicia el servidor backend después de agregar la key

### Las Imágenes no se Generan

**Checklist:**

- ✅ ¿Configuraste `GEMINI_API_KEY` en `.env`?
- ✅ ¿Reiniciaste el servidor después de configurar?
- ✅ ¿Tu API key es válida y tiene cuota disponible?
- ✅ ¿El prompt tiene al menos 10 caracteres?

### Imagen Generada no Coincide con el Prompt

**Mejora tu prompt:**

- Agrega más detalles específicos
- Usa terminología técnica (fotografía, arte)
- Divide prompts complejos en pasos
- Itera: "That's good, but change X to Y"

## 📊 Pricing y Cuotas

**Gemini 2.5 Flash Image:**

- Pricing: Token-based ($30 per 1M tokens)
- Image output: 1290 tokens flat (hasta 1024×1024px)
- Free tier: Disponible en Google AI Studio

**Consulta cuotas actuales:** https://ai.google.dev/pricing

## 🔗 Recursos Adicionales

- **Documentación oficial**: https://ai.google.dev/gemini-api/docs/image-generation
- **Google AI Studio**: https://aistudio.google.com/
- **Ejemplos de prompts**: Ver categoría "Examples" en la UI
- **API Reference**: Ver `/docs/API.md` en este repositorio

---

**¡Disfruta creando con Nano Banana! 🍌🎨**
