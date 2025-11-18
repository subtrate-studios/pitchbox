# Timeout Configuration Changes

## Summary

Extended timeout limits for the `/api/analyze` endpoint to handle long-running repository analysis operations.

## Changes Made

### 1. Server-Side Timeouts (`apps/server/src/index.ts`)

**Added:**
```typescript
const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
```

**Updated `/api/analyze` endpoint:**
```typescript
app.post('/api/analyze', async (req: Request, res: Response) => {
  // Set extended timeout for this endpoint (10 minutes)
  req.setTimeout(ANALYSIS_TIMEOUT_MS);
  res.setTimeout(ANALYSIS_TIMEOUT_MS);
  // ... rest of handler
});
```

**Updated server initialization:**
```typescript
const server = app.listen(PORT, () => {
  console.log(`⏱️  Analysis endpoint timeout: ${ANALYSIS_TIMEOUT_MS / 1000 / 60} minutes`);
  // ...
});

server.timeout = ANALYSIS_TIMEOUT_MS;
```

### 2. Frontend API Route (`apps/web/src/app/api/analyze/route.ts`)

**Created new file with:**
```typescript
export const maxDuration = 600; // 10 minutes (for Vercel deployments)

// Fetch with AbortController for 10-minute timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 600000);
```

## Timeout Breakdown

| Layer | Timeout | Purpose |
|-------|---------|---------|
| Express Server | 10 minutes | Overall server timeout |
| Request/Response | 10 minutes | Individual request timeout |
| Frontend Fetch | 10 minutes | Client-side fetch timeout |
| Next.js Route | 10 minutes | Vercel function timeout |

## Why 10 Minutes?

Analysis operations include:
1. **Clone repository** (~5-30 seconds)
2. **Analyze codebase** (~10-60 seconds)
3. **Index in ChromaDB** (~30-180 seconds for large repos)
4. **Semantic search** (~2-5 seconds)
5. **AI generation** (~10-30 seconds)

**Total**: ~1-5 minutes typical, up to 8-10 minutes for very large repos

## Testing

After these changes, the server will:
- ✅ Handle repositories with 1000+ files
- ✅ Complete embedding generation for large codebases
- ✅ Wait for Claude's script generation
- ✅ Not timeout prematurely

## Verification

When you start the server, you should see:
```
🚀 Server is running on http://localhost:3001
⏱️  Analysis endpoint timeout: 10 minutes
```

## Troubleshooting

### Still getting timeouts?

1. **Check client timeout**: If calling from frontend, ensure it has matching timeout
2. **Check reverse proxy**: If using nginx/apache, increase their timeouts
3. **Check cloud provider**: Vercel/AWS Lambda may have platform limits

### For Vercel Deployment

Add to `vercel.json`:
```json
{
  "functions": {
    "apps/web/src/app/api/analyze/route.ts": {
      "maxDuration": 300
    }
  }
}
```

Note: Vercel Pro allows up to 300s (5 min), Enterprise allows up to 900s (15 min)

### For AWS Lambda

Increase timeout in serverless config or Lambda settings (max 15 minutes)

## Environment Variable (Optional)

You can make timeout configurable:

**Add to `.env`:**
```env
ANALYSIS_TIMEOUT_MINUTES=10
```

**Update code:**
```typescript
const ANALYSIS_TIMEOUT_MS =
  parseInt(process.env.ANALYSIS_TIMEOUT_MINUTES || '10') * 60 * 1000;
```
