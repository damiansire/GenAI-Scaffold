# 🔧 Guía de Solución de Problemas

Esta guía te ayudará a resolver los problemas más comunes que pueden surgir al trabajar con el proyecto AI Gateway.

## 🐳 Problemas con Docker

### Error: "Cannot connect to the Docker daemon"

**Síntoma:**

```
unable to get image 'ai-gateway-api': Cannot connect to the Docker daemon at unix:///Users/personal/.docker/run/docker.sock. Is the docker daemon running?
```

**Solución:**

```bash
# Iniciar Docker Desktop en macOS
open -a Docker

# Verificar que Docker esté corriendo
docker ps

# Si no funciona, reiniciar Docker
killall Docker && open -a Docker
```

### Error: "Docker daemon not running"

**Síntoma:**

```
Cannot connect to the Docker daemon at unix:///Users/personal/.docker/run/docker.sock
```

**Soluciones:**

1. **Iniciar Docker Desktop:**

   ```bash
   open -a Docker
   ```

2. **Verificar instalación:**

   ```bash
   docker --version
   docker-compose --version
   ```

3. **Reinstalar Docker Desktop:**
   ```bash
   brew install --cask docker
   ```

### Error: "Port already in use"

**Síntoma:**

```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Soluciones:**

1. **Cambiar puertos en docker-compose.yml:**

   ```yaml
   ports:
     - "3001:3000" # API en puerto 3001
     - "8081:80" # Frontend en puerto 8081
   ```

2. **Encontrar y parar proceso que usa el puerto:**

   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

3. **Usar puertos diferentes:**
   ```bash
   PORT=3001 docker-compose up
   ```

### Error: "Build failed"

**Síntoma:**

```
ERROR: failed to build: failed to solve: failed to compute cache key
```

**Soluciones:**

1. **Limpiar caché de Docker:**

   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

2. **Verificar archivos de configuración:**

   ```bash
   # Verificar que .env existe
   ls -la .env

   # Verificar contenido
   cat .env
   ```

## 🔑 Problemas con API Keys

### Error: "API Key is required"

**Síntoma:**

```
API Key is required. Please set API_KEY_X or DEFAULT_API_KEY in your environment.
```

**Solución:**

1. **Crear archivo .env:**

   ```bash
   cp env.example .env
   ```

2. **Configurar API key:**

   ```bash
   # Editar .env
   nano .env

   # Agregar tu clave de Gemini
   GEMINI_API_KEY=tu-clave-de-gemini-aqui
   ```

### Error: "Invalid API Key"

**Síntoma:**

```
Invalid API Key
```

**Soluciones:**

1. **Verificar clave en .env:**

   ```bash
   cat .env | grep GEMINI_API_KEY
   ```

2. **Verificar formato:**

   ```bash
   # Debe ser algo como:
   GEMINI_API_KEY=AIzaSyC...
   ```

3. **Regenerar clave en Google AI Studio:**
   - Ir a https://aistudio.google.com/
   - Crear nueva API key
   - Actualizar .env

## 📦 Problemas con Dependencias

### Error: "Module not found"

**Síntoma:**

```
Error: Cannot find module 'express'
```

**Soluciones:**

1. **Reinstalar dependencias:**

   ```bash
   cd ai-gateway
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Verificar workspace:**
   ```bash
   npm run dev --workspace=api
   npm run start --workspace=client
   ```

### Error: "Angular CLI not found"

**Síntoma:**

```
ng: command not found
```

**Solución:**

```bash
# Instalar Angular CLI globalmente
npm install -g @angular/cli

# O usar npx
npx ng serve
```

## 🌐 Problemas de Red

### Error: "CORS policy"

**Síntoma:**

```
Access to fetch at 'http://localhost:3000/api' from origin 'http://localhost:4200' has been blocked by CORS policy
```

**Soluciones:**

1. **Verificar configuración CORS:**

   ```bash
   # En .env
   ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8080
   ```

2. **Verificar puertos:**
   ```bash
   # Frontend debe apuntar al backend correcto
   # En environment.ts
   apiUrl: 'http://localhost:3000/api'
   ```

### Error: "Connection refused"

**Síntoma:**

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Soluciones:**

1. **Verificar que el backend esté corriendo:**

   ```bash
   curl http://localhost:3000/health
   ```

2. **Verificar puertos:**
   ```bash
   lsof -i :3000
   ```

## 🚀 Problemas de Build

### Error: "Build failed - TypeScript"

**Síntoma:**

```
error TS2307: Cannot find module
```

**Soluciones:**

1. **Limpiar y reconstruir:**

   ```bash
   npm run build:api
   npm run build:client
   ```

2. **Verificar tsconfig.json:**
   ```bash
   # Verificar configuración TypeScript
   cat ai-gateway/packages/api/tsconfig.json
   ```

### Error: "Angular build failed"

**Síntoma:**

```
ERROR in Cannot read property 'length' of undefined
```

**Soluciones:**

1. **Limpiar caché de Angular:**

   ```bash
   cd ai-gateway/packages/client
   rm -rf .angular/cache
   npm run build
   ```

2. **Verificar dependencias:**
   ```bash
   npm install
   ```

## 🔍 Comandos de Diagnóstico

### Verificar estado del proyecto:

```bash
# Verificar Docker
docker ps
docker-compose ps

# Verificar puertos
lsof -i :3000
lsof -i :4200
lsof -i :8080

# Verificar procesos Node.js
ps aux | grep node

# Verificar logs
docker-compose logs -f
```

### Verificar configuración:

```bash
# Verificar archivos de configuración
ls -la .env
cat .env

# Verificar package.json
cat ai-gateway/package.json

# Verificar docker-compose
cat docker-compose.yml
```

## 📞 Obtener Ayuda

### Logs útiles:

```bash
# Logs de Docker
docker-compose logs api
docker-compose logs client

# Logs de desarrollo
npm run dev 2>&1 | tee logs/dev.log
```

### Información del sistema:

```bash
# Versiones
node --version
npm --version
docker --version
docker-compose --version

# Sistema
uname -a
sw_vers  # macOS
```

## 🎯 Soluciones Rápidas

### Reiniciar todo:

```bash
# Parar servicios
docker-compose down
killall node

# Limpiar Docker
docker system prune -f

# Reinstalar dependencias
cd ai-gateway
rm -rf node_modules package-lock.json
npm install

# Ejecutar
docker-compose up --build
```

### Modo de desarrollo:

```bash
# Si Docker falla, usar desarrollo local
cd ai-gateway
npm run dev
```

### Verificar salud del sistema:

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:8080/health

# API info
curl http://localhost:3000/api/info
```

---

## 💡 Consejos

1. **Siempre verifica que Docker esté corriendo** con `docker ps`
2. **Mantén actualizado el archivo .env** con tus API keys
3. **Usa `docker-compose logs -f`** para ver errores en tiempo real
4. **Si algo falla, prueba primero con desarrollo local** (`npm run dev`)
5. **Mantén las dependencias actualizadas** con `npm update`

¿Necesitas ayuda con algún problema específico? Revisa esta guía o crea un issue en el repositorio.
