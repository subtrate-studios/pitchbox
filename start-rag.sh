#!/bin/bash

# Pitchbox RAG System Startup Script

echo "🚀 Starting Pitchbox RAG System..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Check if .env exists
if [ ! -f "apps/server/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating from .env.example..."
    cp apps/server/.env.example apps/server/.env
    echo "✅ Created apps/server/.env"
    echo ""
    echo "📝 Please edit apps/server/.env and add your API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter once you've added your API keys..."
fi

# Start ChromaDB
echo "📊 Starting ChromaDB..."
docker-compose up -d

# Wait for ChromaDB to be healthy
echo "⏳ Waiting for ChromaDB to be ready..."
timeout=30
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if curl -f http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo "✅ ChromaDB is ready!"
        break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
    echo -n "."
done

if [ $elapsed -ge $timeout ]; then
    echo ""
    echo "❌ ChromaDB failed to start within ${timeout} seconds"
    echo "Check logs with: docker-compose logs chromadb"
    exit 1
fi

echo ""

# Check if node_modules exists
if [ ! -d "apps/server/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd apps/server
    npm install
    cd ../..
fi

# Start the server
echo ""
echo "🎯 Starting Pitchbox server..."
cd apps/server
npm run dev
