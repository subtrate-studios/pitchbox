# Debugging Guide: "Failed to generate demo script with RAG"

## Quick Debugging Steps

### 1. Check Server Logs

After running your curl command, check the server terminal for detailed logs:

```
🔍 Building search queries...
📋 Generated X search queries
🔎 Retrieving relevant documents from ChromaDB...
📚 Retrieved X relevant documents from vector DB
📝 Building enriched context...
🤖 Generating script with Claude AI...
❌ RAG generation error: [ERROR DETAILS HERE]
```

### 2. Common Issues & Solutions

#### Issue 1: ChromaDB Connection Failed

**Symptoms:**
- Error mentions "connection refused" or "ECONNREFUSED"
- Logs show error at "Retrieving relevant documents"

**Solution:**
```bash
# Check if ChromaDB is running
docker ps | grep chromadb

# If not running:
docker-compose up -d

# Test connection:
curl http://localhost:8000/api/v1/heartbeat
```

#### Issue 2: OpenAI API Key Missing/Invalid

**Symptoms:**
- Error mentions "Invalid API key" or "401 Unauthorized"
- Happens during indexing phase

**Solution:**
```bash
# Check your .env file
cat apps/server/.env | grep OPENAI_API_KEY

# Should show: OPENAI_API_KEY=sk-proj-xxxxx
# If empty or wrong, update it
```

#### Issue 3: Anthropic API Key Missing/Invalid

**Symptoms:**
- Error mentions "authentication" or "401"
- Happens at "Generating script with Claude AI"

**Solution:**
```bash
# Check your .env file
cat apps/server/.env | grep ANTHROPIC_API_KEY

# Should show: ANTHROPIC_API_KEY=sk-ant-xxxxx
```

#### Issue 4: Repository Clone Failed

**Symptoms:**
- Error before reaching ChromaDB indexing
- Mentions "Failed to clone repository"

**Solution:**
- Ensure the GitHub URL is correct and public
- Check your internet connection
- Verify git is installed: `git --version`

#### Issue 5: Rate Limit Exceeded

**Symptoms:**
- Error mentions "rate limit" or "429"
- From OpenAI or Anthropic

**Solution:**
- Wait a few minutes and try again
- Reduce `retrievalCount` in your request
- Upgrade your API plan if hitting limits frequently

### 3. Run Debug Script

```bash
./debug-api.sh
```

This will:
- Test the endpoint with verbose output
- Save logs to `api-debug.log`
- Show you exactly where the error occurs

### 4. Check Each Component

#### Test ChromaDB:
```bash
curl http://localhost:8000/api/v1/heartbeat
# Expected: Should return OK or heartbeat response
```

#### Test Repository Clone:
```bash
cd /tmp
git clone https://github.com/waku-org/opchan/
# Expected: Should clone successfully
```

#### Test OpenAI API:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
# Expected: Should return list of models
```

#### Test Anthropic API:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "test"}]
  }'
# Expected: Should return a response
```

## Detailed Error Logs

The updated code now provides detailed error logging:

### What to Look For:

1. **At what step does it fail?**
   - Clone? → Check git/network
   - Indexing? → Check ChromaDB + OpenAI key
   - Retrieval? → Check ChromaDB collection exists
   - Generation? → Check Anthropic key

2. **Full Error Stack**
   - The logs now show complete error details
   - Look for "Error details:" in server output

3. **Error Name & Message**
   - TypeError → Code issue
   - NetworkError → Connection issue
   - AuthenticationError → API key issue

## Step-by-Step Debugging

### Step 1: Restart Everything
```bash
# Stop server (Ctrl+C)

# Restart ChromaDB
docker-compose restart chromadb

# Wait for it to be ready
sleep 5
curl http://localhost:8000/api/v1/heartbeat

# Restart server
cd apps/server
npm run dev
```

### Step 2: Test with Minimal Request
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/octocat/Hello-World"
  }'
```

This uses a tiny repo with minimal config. If this works, the issue is with the larger repo or specific options.

### Step 3: Test Without RAG
To isolate if it's a RAG issue, temporarily disable RAG:

```bash
# In apps/server/.env, comment out one of the keys:
# OPENAI_API_KEY=
```

Restart server. It should fall back to non-RAG mode. If this works, the issue is RAG-specific.

### Step 4: Check ChromaDB Collections
```bash
curl http://localhost:8000/api/v1/collections
```

Should return a list of collections. If you see your repo collection, ChromaDB indexing worked.

### Step 5: Enable Debug Mode
```bash
# In apps/server/.env, add:
DEBUG=*

# Restart server
npm run dev
```

This will show even more detailed logs.

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED localhost:8000` | ChromaDB not running | `docker-compose up -d` |
| `Invalid API key` | Wrong OpenAI key | Check `.env` file |
| `401 Unauthorized` | Wrong Anthropic key | Check `.env` file |
| `404 Collection not found` | Indexing didn't complete | Check indexing logs |
| `Rate limit exceeded` | Too many API calls | Wait or upgrade plan |
| `Timeout` | Request took too long | Already fixed with 10min timeout |
| `Failed to clone` | Bad GitHub URL | Check URL is correct |

## Still Stuck?

1. **Share server logs** from the moment you start the request
2. **Share the exact curl command** you're using
3. **Check ChromaDB logs**: `docker-compose logs chromadb`
4. **Try a different repository** to rule out repo-specific issues

## Quick Test Repositories

Try these known-good repos:

```bash
# Tiny repo (should be fast)
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/octocat/Hello-World"}'

# Small Next.js repo
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/vercel/next.js-boilerplate"}'
```

If these work but your target repo doesn't, the issue might be repo-specific (size, structure, etc.).
