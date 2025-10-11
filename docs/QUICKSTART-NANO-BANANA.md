# 🍌 Quick Start: Nano Banana (Gemini Image Generation)

## ⚡ Configuración en 3 Pasos

### 1️⃣ Obtén tu API Key

Visita: **https://aistudio.google.com/app/apikey**

- Inicia sesión con tu cuenta de Google
- Click en "Create API Key"
- Copia la key generada

### 2️⃣ Configura tu `.env`

```bash
# En la raíz del proyecto
cp env.example .env
```

Edita `.env` y agrega tu key:

```bash
GEMINI_API_KEY=AIzaSy... # Tu API key aquí
```

### 3️⃣ Inicia el Servidor

```bash
npm run dev
```

**¡Listo!** Abre http://localhost:4200 y navega a **Image Generation** 🎨

---

## 🚀 Primeros Pasos

### Opción 1: Usa un Ejemplo Precargado

1. Click en cualquier tarjeta de ejemplo (Photorealistic, Illustration, etc.)
2. Click en "Generate Image" 🎨
3. ¡Espera unos segundos y observa la magia!

### Opción 2: Escribe tu Propio Prompt

**Ejemplo básico:**

```
A beautiful sunset over snow-capped mountains with dramatic orange
and purple clouds. Wide-angle landscape photography.
```

**Ejemplo avanzado:**

```
A photorealistic close-up of a steaming cup of cappuccino on a rustic
wooden table, shot with a 50mm lens at f/1.8 for creamy bokeh. Warm
morning light streaming from the side. A small silver spoon rests on
the saucer. The foam has a perfect rosetta latte art pattern.
```

### Opción 3: Edita una Imagen

1. Upload tu imagen (click en el área de upload)
2. Describe qué quieres cambiar:

```
Change the blue sofa in this living room to a vintage brown
leather chesterfield. Keep everything else the same.
```

---

## 🎯 Prompts de Ejemplo

### Para Logos

```
Create a modern minimalist logo for a tech startup called "CloudFlow".
Use a clean geometric sans-serif font in deep blue (#1e40af). Include
a simple abstract icon of flowing data streams. Square format.
```

### Para Productos

```
A professional product photo of wireless headphones in matte black,
floating against a pure white background. Studio lighting with soft
shadows. The headphones are slightly rotated to show the side profile.
Ultra-realistic with sharp focus on the ear cups.
```

### Para Arte

```
A watercolor painting of a cozy bookshop on a rainy Parisian street.
Warm yellow light glows from the windows. Soft, impressionistic
brushstrokes with muted colors. A lone figure with an umbrella walks past.
```

### Para Stickers

```
A cute kawaii-style sticker of a smiling avocado character wearing
tiny sunglasses. Bold outlines, flat colors, playful expression.
Transparent background. Perfect for messaging apps.
```

---

## 💰 Costos

- **Modelo**: Gemini 2.5 Flash Image
- **Precio**: $30 por 1 millón de tokens
- **Por imagen**: 1290 tokens flat (~$0.04 por imagen)
- **Free tier**: Disponible en Google AI Studio

**Consulta límites:** https://ai.google.dev/pricing

---

## 🆘 Solución de Problemas

### "GEMINI_API_KEY is not configured"

**Causa:** No se encontró la API key en las variables de entorno.

**Solución:**

1. Verifica que `.env` existe en la raíz del proyecto
2. Verifica que contiene `GEMINI_API_KEY=...`
3. Reinicia el servidor (`Ctrl+C` y luego `npm run dev`)

### La Imagen No Coincide con mi Prompt

**Soluciones:**

1. **Agrega más detalles**: Describe escena, iluminación, estilo
2. **Usa términos técnicos**: "85mm lens", "golden hour light", "bokeh"
3. **Itera**: Genera, luego refina con un nuevo prompt
4. **Sé específico**: "vintage brown leather" vs "brown sofa"

### Imagen Borrosa o de Baja Calidad

**Mejora tu prompt con:**

- "ultra-realistic"
- "sharp focus"
- "high-resolution"
- "professional photography"
- "studio lighting"

---

## 📚 Más Recursos

- **Documentación completa**: `/docs/NANO-BANANA.md`
- **API Reference**: `/docs/API.md` (sección Gemini Image Generation)
- **Gemini Docs**: https://ai.google.dev/gemini-api/docs/image-generation

---

**¿Listo para crear arte con IA? ¡Adelante! 🎨✨**
