# Cloudflare Colombia Live Board

![Cloudflare Colombia](cloudflarecolombia.avif)

Tablero interactivo en tiempo real para eventos y meetups. Los asistentes hacen preguntas, votan por las mejores y el speaker las responde en vivo. Todo corriendo en el **free tier de Cloudflare**.

![Stack](https://img.shields.io/badge/Cloudflare_Workers-F6821F?style=flat&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=flat&logo=hono&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## Arquitectura

El proyecto es un **monorepo con pnpm workspaces** que contiene dos aplicaciones:

```
cc-liveboard/
├── apps/
│   ├── api/          ← Hono API (Cloudflare Worker)
│   └── web/          ← Next.js frontend (OpenNext → Cloudflare Worker)
├── package.json
└── pnpm-workspace.yaml
```

### `apps/api` — Backend (Hono + Cloudflare Worker)

API REST + WebSockets construida con [Hono](https://hono.dev). Se despliega como un Cloudflare Worker.

```
apps/api/src/
├── index.ts                    # Entry point, rutas principales, CORS
├── types.ts                    # Tipos compartidos (Bindings, Question, WSMessage)
├── db/
│   └── schema.sql              # Schema D1 (questions, votes)
├── durable-objects/
│   └── liveboard-room.ts       # Durable Object con WebSocket Hibernation
└── routes/
    ├── questions.ts            # CRUD de preguntas + votación
    └── images.ts               # Upload/serve de imágenes (R2)
```

### `apps/web` — Frontend (Next.js + OpenNext)

SPA con Next.js App Router desplegada en Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare).

```
apps/web/src/
├── app/
│   ├── layout.tsx              # Layout global con metadata
│   ├── page.tsx                # Home: unirse a una sala
│   ├── globals.css             # Tailwind CSS + theme Cloudflare
│   └── [room]/
│       └── page.tsx            # Vista de sala con preguntas en tiempo real
├── components/
│   ├── question-form.tsx       # Formulario con paste-to-upload (Ctrl+V)
│   ├── question-card.tsx       # Tarjeta de pregunta con votos e imagen
│   └── connection-badge.tsx    # Indicador de conexión WebSocket
├── hooks/
│   └── use-liveboard-room.ts   # Hook: WebSocket + estado de la sala
└── lib/
    └── api.ts                  # Cliente API (REST + WebSocket + R2 upload)
```

---

## Servicios de Cloudflare utilizados

Todos dentro del **free tier** (sin tarjeta de crédito):

| Servicio | Dónde se usa | Free tier |
|---|---|---|
| **Workers** | API backend (Hono) + Frontend SSR (Next.js) | 100K req/día |
| **D1** | Base de datos SQL para preguntas y votos | 5GB storage, 5M reads/día |
| **Durable Objects** | WebSocket rooms para tiempo real (Hibernation API) | 100K req/día |
| **R2** | Almacenamiento de imágenes adjuntas a preguntas | 10GB, 0 egress fees |
| **Workers Assets** | Archivos estáticos del frontend (JS, CSS, imágenes) | Ilimitado |

### Cómo se conecta todo

```
┌─────────────────────┐     HTTPS/WSS      ┌──────────────────────────┐
│                     │ ──────────────────→ │  cc-liveboard-api Worker │
│   Browser           │                     │  (Hono)                  │
│   (Next.js SPA)     │     REST API        │                          │
│                     │ ←─────────────────→ │  ├─ D1 (preguntas)       │
│                     │                     │  ├─ R2 (imágenes)        │
│                     │     WebSocket       │  └─ Durable Objects      │
│                     │ ←──────────────────→│     (salas real-time)    │
└─────────────────────┘                     └──────────────────────────┘
  cc-liveboard-web Worker
  (Next.js + OpenNext)
```

---

## Environments (dev / prod)

El proyecto usa **wrangler environments** para separar desarrollo y producción. Cada ambiente tiene sus propios recursos (D1, R2, Workers):

| Recurso | Dev (`--env dev`) | Prod (`--env prod`) |
|---|---|---|
| **API Worker** | `cc-liveboard-api-dev` | `cc-liveboard-api` |
| **Web Worker** | `cc-liveboard-web-dev` | `cc-liveboard-web` |
| **D1 Database** | `cc-liveboard-db-dev` | `cc-liveboard-db` |
| **R2 Bucket** | `cc-liveboard-images-dev` | `cc-liveboard-images` |

Los bindings en wrangler **no se heredan** entre ambientes — por eso se definen explícitamente en cada `env`.
Las migrations de Durable Objects son **top-level only** (compartidas entre ambientes).

---

## Desarrollo local

### Requisitos previos

- **Node.js** >= 20
- **pnpm** (`npm install -g pnpm`)
- Cuenta de Cloudflare (solo para deploy, no para desarrollo local)

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Inicializar la base de datos local

```bash
cd apps/api
pnpm db:init
```

### 3. Iniciar los servidores de desarrollo

En dos terminales separadas:

```bash
# Terminal 1: API (Hono) en http://localhost:8787
pnpm dev:api

# Terminal 2: Frontend (Next.js) en http://localhost:3000
pnpm dev:web
```

### 4. Abrir en el navegador

- **Home:** http://localhost:3000
- **API Health:** http://localhost:8787
- Escribe un nombre de sala (ej: `cloudflare-colombia`) y haz click en "Unirse"

---

## Deploy en Cloudflare

### Paso 0: Iniciar sesión

```bash
npx wrangler login
```

Se abrirá el navegador para autorizar tu cuenta. No requiere plan de pago.

---

### Deploy ambiente DEV

#### 1. Crear recursos D1 y R2 para dev

```bash
cd apps/api

# Crear D1
npx wrangler d1 create cc-liveboard-db-dev

# Crear R2 # R2 is not included in the free tier so this is optional
npx wrangler r2 bucket create cc-liveboard-images-dev
```

#### 2. Actualizar `apps/api/wrangler.jsonc`

Copia el `database_id` que te dio el comando anterior y pégalo en **dos lugares** del archivo:

- En el bloque top-level `d1_databases` (campo `database_id`)
- En `env.dev > d1_databases` (campo `database_id`)

#### 3. Inicializar schema D1 remoto (dev)

```bash
cd apps/api
pnpm db:init:dev
```

#### 4. Desplegar API (dev)

```bash
pnpm deploy:dev:api
# → https://cc-liveboard-api-dev.<tu-subdomain>.workers.dev
```

#### 5. Configurar URL en el frontend

Crea `apps/web/.env.production` (puedes copiar de `.env.production.example`):

```env
NEXT_PUBLIC_API_URL=https://cc-liveboard-api-dev.<tu-subdomain>.workers.dev
NEXT_PUBLIC_WS_URL=wss://cc-liveboard-api-dev.<tu-subdomain>.workers.dev
```

#### 6. Desplegar frontend (dev)

```bash
pnpm deploy:dev:web
# → https://cc-liveboard-web-dev.<tu-subdomain>.workers.dev
```

---

### Deploy ambiente PROD

#### 1. Crear recursos D1 y R2 para producción

```bash
cd apps/api

# Crear D1
npx wrangler d1 create cc-liveboard-db

# Crear R2
npx wrangler r2 bucket create cc-liveboard-images
```

#### 2. Actualizar `apps/api/wrangler.jsonc`

Copia el `database_id` y pégalo en `env.prod > d1_databases`.

#### 3. Inicializar schema D1 remoto (prod)

```bash
cd apps/api
pnpm db:init:prod
```

#### 4. Desplegar API (prod)

```bash
pnpm deploy:prod:api
# → https://cc-liveboard-api.<tu-subdomain>.workers.dev
```

#### 5. Configurar URL en el frontend

Actualiza `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://cc-liveboard-api.<tu-subdomain>.workers.dev
NEXT_PUBLIC_WS_URL=wss://cc-liveboard-api.<tu-subdomain>.workers.dev
```

#### 6. Desplegar frontend (prod)

```bash
pnpm deploy:prod:web
# → https://cc-liveboard-web.<tu-subdomain>.workers.dev
```

---

## Comandos útiles

| Comando | Descripción |
|---|---|
| `pnpm dev:api` | API en modo desarrollo local (puerto 8787) |
| `pnpm dev:web` | Frontend en modo desarrollo local (puerto 3000) |
| `pnpm deploy:dev:api` | Desplegar API en ambiente **dev** |
| `pnpm deploy:dev:web` | Desplegar frontend en ambiente **dev** |
| `pnpm deploy:prod:api` | Desplegar API en ambiente **prod** |
| `pnpm deploy:prod:web` | Desplegar frontend en ambiente **prod** |
| `cd apps/api && pnpm db:init` | Inicializar D1 local |
| `cd apps/api && pnpm db:init:dev` | Inicializar D1 en dev remoto |
| `cd apps/api && pnpm db:init:prod` | Inicializar D1 en producción |

---

## Tecnologías

- **[Hono](https://hono.dev)** — Framework web ultraligero para Cloudflare Workers
- **[Next.js](https://nextjs.org)** — Framework React con App Router
- **[OpenNext](https://opennext.js.org/cloudflare)** — Adaptador para correr Next.js en Cloudflare Workers
- **[Tailwind CSS](https://tailwindcss.com)** — Estilos utility-first
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** — CLI de Cloudflare (config en formato JSONC)
- **[pnpm Workspaces](https://pnpm.io/workspaces)** — Monorepo management

---

## Licencia

MIT
