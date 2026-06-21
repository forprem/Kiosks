#!/usr/bin/env bash

# Kiosk Booking Platform - Quick local setup script
# This script sets up the entire project with minimal manual steps

set -e

echo "🚀 Kiosk Booking Platform - Setup Script"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Install from: https://nodejs.org/en/ (LTS 20+)"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "📝 Creating environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo "   ⚠️  Update DATABASE_URL with your Neon/Supabase connection string"
else
    echo "⏭️  backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "⏭️  frontend/.env already exists"
fi

echo ""
echo "🗄️  Setting up database..."
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
cd ..
echo "✅ Database initialized"

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Update backend/.env with your database connection string"
echo "   2. In terminal 1: cd backend && npm run dev"
echo "   3. In terminal 2: cd frontend && npm run dev"
echo "   4. Open http://localhost:5173"
echo ""
echo "📖 Documentation:"
echo "   - Quick start: QUICK_START.md"
echo "   - Local dev: DEVELOPMENT.md"
echo "   - Deployment: DEPLOYMENT.md"
echo "   - API reference: API.md"
