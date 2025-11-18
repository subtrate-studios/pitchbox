# RAG (Retrieval Augmented Generation) Setup Guide

This guide explains how to set up and use the RAG system with ChromaDB and OpenAI embeddings for enhanced repository analysis.

## Architecture Overview

```
GitHub Repository
    ↓
Clone Repository
    ↓
Analyze Codebase
    ↓
Index in ChromaDB with OpenAI Embeddings
    ↓
Semantic Search for Relevant Context
    ↓
Generate Script with Claude + Retrieved Context
```

## What is RAG?

RAG (Retrieval Augmented Generation) combines:
1. **Vector Database (ChromaDB)**: Stores code snippets as embeddings
2. **Semantic Search (OpenAI)**: Finds relevant code based on meaning, not just keywords
3. **AI Generation (Claude)**: Creates scripts using retrieved relevant context

### Benefits vs Non-RAG:
- ✅ More accurate understanding of large codebases
- ✅ Finds relevant code even with different terminology
- ✅ Better context for AI script generation
- ✅ Handles repositories with 1000+ files
- ✅ Semantic search ("authentication flow" finds login code)

## Prerequisites

1. **Docker & Docker Compose** (for ChromaDB)
2. **OpenAI API Key** (for embeddings)
3. **Anthropic API Key** (for script generation)

## Setup Instructions

### 1. Start ChromaDB

From the project root:

```bash
docker-compose up -d
```

This starts ChromaDB on `http://localhost:8000`

Verify it's running:
```bash
curl http://localhost:8000/api/v1/heartbeat
```

### 2. Configure Environment Variables

Copy and edit `.env`:

```bash
cd apps/server
cp .env.example .env
```

Add your API keys:

```env
# Required for RAG
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# ChromaDB (default values)
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### 3. Start the Server

```bash
npm run dev
```

You should see:
```
✅ RAG system initialized successfully
🚀 Server is running on http://localhost:3001
```

## How It Works

### 1. Indexing Phase

When you call `/api/analyze`, the system:

```javascript
// 1. Chunks code into documents
const documents = [
  { type: 'readme', content: '...', metadata: {...} },
  { type: 'file', content: 'code chunk', metadata: {...} },
  { type: 'feature', content: '...', metadata: {...} },
  { type: 'flow', content: '...', metadata: {...} },
  { type: 'api', content: 'GET /api/users', metadata: {...} },
];

// 2. Generates embeddings using OpenAI
// text-embedding-3-small model (1536 dimensions)

// 3. Stores in ChromaDB
await collection.add({
  ids: ['file_abc123', 'feature_xyz789'],
  documents: ['code content...', 'feature description...'],
  metadatas: [{type: 'file', path: 'src/app.ts'}],
});
```

### 2. Retrieval Phase

When generating the script:

```javascript
// 1. Build search queries
const queries = [
  "What is the main purpose of this application?",
  "How does authentication work?",
  "What are the main API endpoints?"
];

// 2. Semantic search in ChromaDB
const results = await vectorIndexer.search(collectionName, query, {
  limit: 20,
});

// Results ranked by relevance (cosine similarity)
[
  { content: "auth code...", relevance: 0.95 },
  { content: "login flow...", relevance: 0.87 },
]
```

### 3. Generation Phase

```javascript
// 1. Build enriched context with retrieved docs
const context = `
# Retrieved Context (Ranked by Relevance)

## Documentation
### README.md (Relevance: 95.2%)
This application is a...

## Relevant Code Snippets
### src/auth/login.ts (Relevance: 87.3%)
\`\`\`typescript
export async function login(credentials) {
  // authentication logic
}
\`\`\`
`;

// 2. Send to Claude with context
const prompt = `
You are a demo script writer.
Here is relevant context from the codebase:
${context}

Create a compelling demo script...
`;

// 3. Claude generates script using retrieved context
```

## API Usage

### Analyze Repository with RAG

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/vercel/next.js",
    "style": "business",
    "targetDuration": 180,
    "focusAreas": ["routing", "data-fetching"]
  }'
```

### Response

```json
{
  "status": "success",
  "repository": { ... },
  "analysis": { ... },
  "demoScript": {
    "fullScript": "## INTRODUCTION\nWelcome to Next.js...",
    "sections": [...],
    "metadata": {
      "retrievedDocuments": 20
    }
  }
}
```

## Vector Search Examples

### Indexed Document Types

1. **README** - Documentation and overview
2. **File** - Source code chunks (1000 chars each)
3. **Feature** - Detected features with descriptions
4. **Flow** - User flows and journeys
5. **API** - API endpoints with methods
6. **Component** - UI components
7. **Model** - Data models and schemas

### Search Query Examples

- "How does authentication work?" → Finds auth-related code
- "What are the payment features?" → Finds payment logic
- "How to create a new user?" → Finds user creation flows
- "API for fetching products" → Finds product API endpoints

### Metadata Filtering

```typescript
// Search only for API endpoints
await vectorIndexer.search(collectionName, "user management", {
  limit: 10,
  filter: { type: 'api' }
});

// Search only TypeScript files
await vectorIndexer.search(collectionName, "authentication", {
  limit: 10,
  filter: { language: 'typescript' }
});
```

## ChromaDB Management

### View Collections

```bash
curl http://localhost:8000/api/v1/collections
```

### Delete a Collection

```typescript
await vectorIndexer.deleteCollection('https://github.com/user/repo');
```

### ChromaDB UI

Access the admin UI at: `http://localhost:8000`

## Troubleshooting

### ChromaDB not running

```bash
# Check if container is running
docker ps | grep chromadb

# Restart ChromaDB
docker-compose restart chromadb

# View logs
docker-compose logs -f chromadb
```

### OpenAI API Errors

```
Error: Invalid API key
```
- Check `OPENAI_API_KEY` in `.env`
- Verify key at https://platform.openai.com/api-keys

```
Error: Rate limit exceeded
```
- OpenAI free tier has rate limits
- Reduce `retrievalCount` option
- Upgrade to paid tier

### System Falls Back to Non-RAG

If you see:
```
✨ Generating demo script (non-RAG fallback)...
```

Reasons:
1. Missing `OPENAI_API_KEY`
2. Missing `ANTHROPIC_API_KEY`
3. ChromaDB not running
4. Connection error to ChromaDB

## Performance Considerations

### Indexing Time

- Small repo (< 100 files): ~10-20 seconds
- Medium repo (100-500 files): ~30-60 seconds
- Large repo (500+ files): ~1-3 minutes

### Retrieval Time

- Vector search: ~100-500ms
- 20 queries: ~2-5 seconds total

### Costs

**OpenAI Embeddings (text-embedding-3-small)**:
- $0.02 per 1M tokens
- Average repo: ~50,000 tokens
- Cost per repo: ~$0.001

**Claude (sonnet-4-5)**:
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- Average cost per script: ~$0.05-0.15

## Advanced Configuration

### Custom Embedding Model

Edit `ChromaDBClient.ts`:

```typescript
private getEmbeddingFunction(): OpenAIEmbeddingFunction {
  return new OpenAIEmbeddingFunction({
    openai_api_key: this.openaiApiKey,
    openai_model: 'text-embedding-3-large', // Higher quality
  });
}
```

### Adjust Chunk Size

Edit `VectorIndexer.ts`:

```typescript
const chunks = this.chunkContent(file.content, 2000); // Larger chunks
```

### Change Retrieval Count

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "...",
    "retrievalCount": 30
  }'
```

## Comparison: RAG vs Non-RAG

| Feature | Non-RAG | RAG |
|---------|---------|-----|
| **Max files analyzed** | ~30 key files | Unlimited |
| **Search type** | Pattern matching | Semantic search |
| **Context limit** | ~10KB | ~100KB+ |
| **Accuracy** | Good for small repos | Excellent for all sizes |
| **Setup complexity** | Simple | Requires ChromaDB |
| **Cost per analysis** | $0.03-0.10 | $0.04-0.15 |
| **Speed** | 30-60s | 45-90s |

## Next Steps

- [Main README](./apps/server/README.md)
- [API Documentation](./apps/server/README.md#api-endpoints)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
