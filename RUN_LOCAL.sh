#!/bin/bash

echo "🚀 Starting AssetPulse Locally..."
echo ""
echo "📋 This script will:"
echo "1. Setup Python virtual environment"
echo "2. Install backend dependencies"
echo "3. Install frontend dependencies"
echo "4. Start backend on port 8000"
echo "5. Start frontend on port 5173"
echo ""

# Setup Python venv
echo "⚙️  Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
echo "📦 Installing backend dependencies..."
pip install -q fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-dotenv httpx redis aioredis slowapi python-jose passlib python-multipart pydantic-settings alembic pandas numpy scikit-learn statsmodels arch textblob praw tweepy

# Create .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating .env file..."
    cat > backend/.env << 'ENV'
DATABASE_URL=sqlite:///./data/assetpulse.db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=assetpulse-local-secret-key
DEBUG=true
ALLOWED_ORIGINS=*
NEWSAPI_KEY=test
FRED_API_KEY=test
REDDIT_CLIENT_ID=test
REDDIT_CLIENT_SECRET=test
TWITTER_BEARER_TOKEN=test
ENV
fi

echo ""
echo "✅ Backend is ready!"
echo ""
echo "🎯 TO START YOUR APP:"
echo ""
echo "TERMINAL 1 - Backend (API + Docs):"
echo "cd /home/gautham/cryptostock-pro"
echo "source venv/bin/activate"
echo "python -m uvicorn backend.app.main:app --reload --port 8000"
echo ""
echo "TERMINAL 2 - Frontend (UI):"
echo "cd /home/gautham/cryptostock-pro/frontend"
echo "npm install"
echo "npm run dev"
echo ""
echo "🌐 THEN OPEN IN BROWSER:"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "✨ That's it! Your app will be running locally!"
echo ""
