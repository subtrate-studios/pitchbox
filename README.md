# Pitchbox Monorepo

A monorepo containing a Next.js web application and a Node.js TypeScript server.

## Structure

```
pitchbox/
├── apps/
│   ├── web/          # Next.js application
│   └── server/       # Node.js TypeScript server
├── package.json      # Root workspace configuration
└── tsconfig.json     # Base TypeScript configuration
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run all apps in development mode:
```bash
npm run dev
```

Run individual apps:
```bash
npm run dev:web      # Next.js app (http://localhost:3000)
npm run dev:server   # Node.js server (http://localhost:3001)
```

### Build

Build all apps:
```bash
npm run build
```

Build individual apps:
```bash
npm run build:web
npm run build:server
```

### Type Checking

Type check all apps:
```bash
npm run type-check
```

## Apps

### Web (Next.js)

Located in `apps/web/`, this is a Next.js 14 application with TypeScript.

- **Port**: 3000 (default)
- **Framework**: Next.js 14
- **Language**: TypeScript

### Server (Node.js)

Located in `apps/server/`, this is an Express.js server with TypeScript.

- **Port**: 3001 (default, configurable via PORT env var)
- **Framework**: Express.js
- **Language**: TypeScript
- **Endpoints**:
  - `GET /health` - Health check endpoint
  - `GET /api/hello` - Example API endpoint

## Workspace Scripts

All scripts can be run from the root:

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps
- `npm run type-check` - Type check all apps
- `npm run dev:web` - Start only the web app
- `npm run dev:server` - Start only the server
- `npm run build:web` - Build only the web app
- `npm run build:server` - Build only the server

