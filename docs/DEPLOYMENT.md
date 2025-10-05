# 🚀 Guía de Despliegue

Esta guía te ayudará a desplegar el proyecto AI Gateway en diferentes entornos de producción.

## 🐳 Despliegue con Docker

### Requisitos

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM mínimo
- 10GB espacio en disco

### 1. Configuración de Producción

#### Crear archivo de configuración:

```bash
# Crear .env para producción
cp env.example .env.production

# Editar configuración
nano .env.production
```

#### Configuración recomendada:

```bash
# API Keys
GEMINI_API_KEY=tu-clave-de-gemini-real
API_KEY_1=clave-segura-1:read,write
API_KEY_2=clave-segura-2:read
DEFAULT_API_KEY=clave-por-defecto-segura

# Servidor
NODE_ENV=production
PORT=3000

# CORS (ajustar según tu dominio)
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Docker
COMPOSE_PROJECT_NAME=ai-gateway-prod
```

### 2. Despliegue Local

```bash
# Construir y ejecutar
docker-compose -f docker-compose.yml --env-file .env.production up --build -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 3. Despliegue en Servidor

#### Preparar el servidor:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Crear usuario para la aplicación
sudo useradd -m -s /bin/bash aigateway
sudo usermod -aG docker aigateway
```

#### Desplegar la aplicación:

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/GenAI-Scaffold.git
cd GenAI-Scaffold

# Configurar variables de entorno
cp env.example .env.production
nano .env.production

# Desplegar
docker-compose --env-file .env.production up --build -d

# Verificar
curl http://localhost:3000/health
curl http://localhost:8080/health
```

## ☁️ Despliegue en la Nube

### AWS (Amazon Web Services)

#### 1. Preparar infraestructura:

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciales
aws configure
```

#### 2. Crear ECS Task Definition:

```json
{
  "family": "ai-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/ai-gateway-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:gemini-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ai-gateway",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    },
    {
      "name": "client",
      "image": "your-account.dkr.ecr.region.amazonaws.com/ai-gateway-client:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "dependsOn": [
        {
          "containerName": "api",
          "condition": "HEALTHY"
        }
      ]
    }
  ]
}
```

#### 3. Desplegar en ECS:

```bash
# Crear cluster
aws ecs create-cluster --cluster-name ai-gateway-cluster

# Crear servicio
aws ecs create-service \
  --cluster ai-gateway-cluster \
  --service-name ai-gateway-service \
  --task-definition ai-gateway:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

### Google Cloud Platform

#### 1. Configurar Cloud Run:

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ai-gateway
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
        - image: gcr.io/PROJECT_ID/ai-gateway-api
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: GEMINI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: gemini-api-key
                  key: key
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
```

#### 2. Desplegar:

```bash
# Configurar gcloud
gcloud auth login
gcloud config set project PROJECT_ID

# Construir y desplegar
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-gateway-api
gcloud run deploy ai-gateway --image gcr.io/PROJECT_ID/ai-gateway-api --platform managed
```

### Azure

#### 1. Configurar Container Instances:

```bash
# Crear grupo de recursos
az group create --name ai-gateway-rg --location eastus

# Desplegar contenedores
az container create \
  --resource-group ai-gateway-rg \
  --name ai-gateway \
  --image your-registry.azurecr.io/ai-gateway:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 8080 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables GEMINI_API_KEY=your-key
```

## 🔧 Configuración de Nginx (Reverso Proxy)

### Configuración para producción:

```nginx
# /etc/nginx/sites-available/ai-gateway
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redireccionar HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health checks
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## 🔒 Configuración de Seguridad

### 1. Firewall

```bash
# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw deny 8080/tcp
sudo ufw enable
```

### 2. SSL/TLS

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Variables de Entorno Seguras

```bash
# Usar secrets manager
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name "gemini-api-key" \
  --description "API Key for Gemini" \
  --secret-string "tu-clave-aqui"

# HashiCorp Vault
vault kv put secret/ai-gateway gemini_api_key="tu-clave-aqui"
```

## 📊 Monitoreo y Logs

### 1. Configurar Logs

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  api:
    # ... configuración existente ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.tu-dominio.com`)"

  client:
    # ... configuración existente ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 2. Monitoreo con Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "ai-gateway"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/metrics"
    scrape_interval: 5s
```

### 3. Alertas

```yaml
# alertmanager.yml
route:
  group_by: ["alertname"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: "web.hook"

receivers:
  - name: "web.hook"
    webhook_configs:
      - url: "http://localhost:5001/"
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push API image
        run: |
          docker build -f .docker/Dockerfile.server -t $ECR_REGISTRY/ai-gateway-api:$GITHUB_SHA .
          docker push $ECR_REGISTRY/ai-gateway-api:$GITHUB_SHA

      - name: Build and push Client image
        run: |
          docker build -f .docker/Dockerfile.client -t $ECR_REGISTRY/ai-gateway-client:$GITHUB_SHA .
          docker push $ECR_REGISTRY/ai-gateway-client:$GITHUB_SHA

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster ai-gateway-cluster --service ai-gateway-service --force-new-deployment
```

## 🚀 Comandos de Despliegue

### Despliegue completo:

```bash
# 1. Preparar entorno
cp env.example .env.production
nano .env.production

# 2. Construir y desplegar
docker-compose --env-file .env.production up --build -d

# 3. Verificar
curl http://localhost:3000/health
curl http://localhost:8080/health

# 4. Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ai-gateway
sudo ln -s /etc/nginx/sites-available/ai-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. Configurar SSL
sudo certbot --nginx -d tu-dominio.com
```

### Actualización:

```bash
# 1. Actualizar código
git pull origin main

# 2. Reconstruir y redesplegar
docker-compose --env-file .env.production up --build -d

# 3. Verificar
docker-compose ps
docker-compose logs -f
```

### Rollback:

```bash
# Volver a versión anterior
docker-compose --env-file .env.production down
git checkout HEAD~1
docker-compose --env-file .env.production up --build -d
```

## 📋 Checklist de Despliegue

### Antes del despliegue:

- [ ] Variables de entorno configuradas
- [ ] API keys válidas
- [ ] Certificados SSL configurados
- [ ] Firewall configurado
- [ ] Backup de datos existentes

### Durante el despliegue:

- [ ] Construcción de imágenes exitosa
- [ ] Contenedores iniciados correctamente
- [ ] Health checks pasando
- [ ] Logs sin errores críticos

### Después del despliegue:

- [ ] Aplicación accesible
- [ ] API respondiendo
- [ ] Frontend cargando
- [ ] Monitoreo activo
- [ ] Alertas configuradas

## 🔧 Mantenimiento

### Tareas regulares:

```bash
# Actualizar dependencias
docker-compose pull
docker-compose up --build -d

# Limpiar imágenes no utilizadas
docker system prune -a

# Rotar logs
sudo logrotate /etc/logrotate.d/docker

# Backup de configuración
tar -czf backup-$(date +%Y%m%d).tar.gz .env.production docker-compose.yml
```

### Monitoreo:

```bash
# Verificar estado
docker-compose ps
docker stats

# Ver logs
docker-compose logs -f --tail=100

# Verificar recursos
df -h
free -h
```

---

¿Necesitas ayuda con algún aspecto específico del despliegue? Revisa la documentación o crea un issue en el repositorio.
