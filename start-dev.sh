#!/bin/bash

echo "🚀 Starting Football Pro App Development Environment"
echo "=================================================="

# Check if backend is running on port 8080
echo "🔍 Checking if backend is running on port 8080..."
if curl -s http://localhost:8080/api/fields > /dev/null 2>&1; then
    echo "✅ Backend is running on port 8080"
else
    echo "❌ Backend is not running on port 8080"
    echo "   Please start your backend server first"
    echo "   The frontend will proxy API calls to http://localhost:8080"
    exit 1
fi

echo ""
echo "🌐 Starting Angular development server..."
echo "   Frontend: http://localhost:4200"
echo "   Backend:  http://localhost:8080"
echo "   Proxy:    /api/* -> http://localhost:8080/api/*"
echo ""

# Start Angular dev server
ng serve --open 