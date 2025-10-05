# 🚀 Guía de Desarrollo

Esta guía te ayudará a configurar y desarrollar el proyecto AI Gateway de manera efectiva.

## 📋 Prerrequisitos

### Software necesario:

- **Node.js** (v18 o superior)
- **npm** (v8 o superior)
- **Angular CLI** (v20 o superior)
- **Docker** (opcional, para contenedores)
- **Git** (para control de versiones)

### Verificar instalaciones:

```bash
node --version    # Debe ser v18+
npm --version     # Debe ser v8+
ng version        # Debe ser v20+
docker --version  # Opcional
git --version
```

## 🏗️ Configuración del Entorno

### 1. Clonar el repositorio:

```bash
git clone https://github.com/damiansire/GenAI-Scaffold.git
cd GenAI-Scaffold
```

### 2. Configurar variables de entorno:

```bash
# Crear archivo de configuración
cp env.example .env

# Editar con tus valores
nano .env
```

### 3. Instalar dependencias:

```bash
npm install
```

## 🛠️ Modos de Ejecución

### Desarrollo Local (Recomendado para desarrollo activo):

```bash
# Ejecutar ambos servicios simultáneamente
npm run dev

# Solo backend
npm run start:api

# Solo frontend
npm run start:client
```

**URLs de desarrollo:**

- Frontend: http://localhost:4200
- Backend: http://localhost:3000

### Docker (Recomendado para producción/testing):

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down
```

**URLs de Docker:**

- Frontend: http://localhost:8080
- Backend: http://localhost:3000

## 🏛️ Arquitectura del Proyecto

### Estructura del Monorepo:

```
/GenAI-Scaffold/
├── packages/
│   ├── api/          # Backend Node.js
│   │   ├── src/
│   │   │   ├── api/           # Rutas y controladores
│   │   │   ├── core/          # Clases base (ApiError)
│   │   │   ├── models/        # Factory, Registry, Loader
│   │   │   └── plugins/       # Estrategias de IA
│   │   └── package.json
│   └── client/        # Frontend Angular
│       ├── src/
│       │   └── app/
│       │       ├── core/      # Servicios singleton
│       │       └── features/  # Componentes por funcionalidad
│       └── package.json
├── package.json       # Configuración del workspace
└── package-lock.json  # Archivo de bloqueo de dependencias
```

### Patrones de Diseño Implementados:

#### Backend:

- **Factory Pattern**: `ModelFactory` para crear estrategias de IA
- **Registry Pattern**: `SchemaRegistry` para gestión de esquemas
- **Strategy Pattern**: `IModelStrategy` para diferentes modelos de IA
- **Middleware Pattern**: Autenticación, validación, manejo de errores

#### Frontend:

- **Service Pattern**: `ApiService` para comunicación con backend
- **Component Pattern**: Componentes standalone de Angular
- **Signal Pattern**: Gestión de estado reactivo

## 🔌 Desarrollo de Plugins

### Crear un nuevo plugin de IA:

1. **Crear directorio del plugin:**

```bash
mkdir packages/api/src/plugins/mi-nuevo-plugin
```

2. **Implementar el plugin:**

```typescript
// packages/api/src/plugins/mi-nuevo-plugin/index.ts
import {
  IModelStrategy,
  ProcessContext,
  ModelOutput,
} from "../../models/strategy.interface";

export const modelId = "mi-nuevo-plugin";

export const configSchema = {
  type: "object",
  properties: {
    input: {
      type: "string",
      description: "Texto de entrada",
      minLength: 1,
    },
  },
  required: ["input"],
  additionalProperties: false,
};

export class ModelStrategy implements IModelStrategy<any, any> {
  getModelInfo() {
    return {
      modelId: modelId,
      description: "Mi nuevo plugin de IA",
      inputSchema: configSchema,
      outputSchema: {
        type: "object",
        properties: {
          result: { type: "string" },
        },
      },
    };
  }

  async process(
    params: any,
    context: ProcessContext
  ): Promise<ModelOutput<any>> {
    // Implementar lógica del plugin
    const result = `Procesado: ${params.input}`;

    return {
      result: { result },
      metadata: {
        modelId: modelId,
        processingTime: 100,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

3. **El plugin se cargará automáticamente** al reiniciar el servidor.

## 🧪 Testing

### Backend:

```bash
# Ejecutar tests del backend
cd ai-gateway/packages/api
npm test

# Tests con coverage
npm run test:coverage
```

### Frontend:

```bash
# Ejecutar tests del frontend
cd ai-gateway/packages/client
npm test

# Tests e2e
npm run e2e
```

### Integración:

```bash
# Test completo del sistema
npm run test:integration
```

## 🔧 Scripts Disponibles

### Root (directorio principal):

```bash
npm run dev              # Desarrollo completo
npm run build            # Build de producción
npm run build:api        # Build solo backend
npm run build:client     # Build solo frontend
npm run start:api        # Solo backend
npm run start:client     # Solo frontend
```

### Backend (packages/api/):

```bash
npm run build            # Compilar TypeScript
npm run dev              # Desarrollo con hot reload
npm run start            # Ejecutar compilado
npm test                 # Ejecutar tests
```

### Frontend (packages/client/):

```bash
npm run build            # Build de producción
npm run build:prod       # Build optimizado
npm start                # Servidor de desarrollo
npm test                 # Tests unitarios
npm run e2e              # Tests e2e
```

## 📊 Monitoreo y Debugging

### Logs del sistema:

```bash
# Logs de desarrollo
npm run dev 2>&1 | tee logs/dev.log

# Logs de Docker
docker-compose logs -f

# Logs específicos
docker-compose logs -f api
docker-compose logs -f client
```

### Health checks:

```bash
# Backend
curl http://localhost:3000/health

# Frontend (Docker)
curl http://localhost:8080/health

# API info
curl http://localhost:3000/api/info
```

### Debugging:

```bash
# Debug del backend
cd packages/api
npm run dev -- --inspect

# Debug del frontend
cd packages/client
ng serve --source-map
```

## 🚀 Deployment

### Build de producción:

```bash
# Build completo
npm run build

# Build individual
npm run build:api
npm run build:client
```

### Docker para producción:

```bash
# Build optimizado
docker-compose -f docker-compose.prod.yml up --build

# Push a registry
docker-compose push
```

## 🔄 Flujo de Trabajo

### 1. Desarrollo de nuevas características:

```bash
# Crear rama
git checkout -b feature/nueva-funcionalidad

# Desarrollo
npm run dev

# Tests
npm test

# Commit
git add .
git commit -m "feat: nueva funcionalidad"

# Push
git push origin feature/nueva-funcionalidad
```

### 2. Desarrollo de plugins:

```bash
# Crear plugin
mkdir packages/api/src/plugins/mi-plugin

# Implementar
# ... código del plugin ...

# Probar
npm run dev
curl -X POST http://localhost:3000/api/models/mi-plugin/invoke \
  -H "X-API-Key: default-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"input": "test"}'
```

### 3. Debugging:

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Debug específico
docker-compose exec api sh
docker-compose exec client sh

# Verificar estado
docker-compose ps
```

## 📚 Recursos Adicionales

### Documentación:

- [Troubleshooting](TROUBLESHOOTING.md) - Solución de problemas
- [API Documentation](API.md) - Documentación de la API
- [Deployment Guide](DEPLOYMENT.md) - Guía de despliegue

### Enlaces útiles:

- [Angular Documentation](https://angular.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Google Gemini API](https://ai.google.dev/docs)

## 🤝 Contribución

### Estándares de código:

- **TypeScript**: Tipado estricto
- **ESLint**: Linting automático
- **Prettier**: Formato de código
- **Conventional Commits**: Mensajes de commit

### Proceso de contribución:

1. Fork del repositorio
2. Crear rama feature
3. Implementar cambios
4. Ejecutar tests
5. Crear Pull Request

---

¿Necesitas ayuda con algún aspecto específico del desarrollo? Revisa la documentación o crea un issue en el repositorio.
