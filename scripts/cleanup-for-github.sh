#!/bin/bash
# Cleanup script to prepare repository for GitHub push
# This removes all logs, databases, and temporary files

echo "🧹 ChatSG Repository Cleanup Script"
echo "This will remove all logs, databases, and temporary files"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

echo "📁 Cleaning up log files..."
find . -name "*.log" -type f -delete
find . -name "logs" -type d -exec rm -rf {} + 2>/dev/null || true

echo "🗄️ Cleaning up database files..."
find . -name "*.db" -type f -delete
find . -name "*.sqlite" -type f -delete
find . -name "*.sqlite3" -type f -delete

echo "📝 Cleaning up JSON log files..."
rm -f logs/*.json
rm -f backend/logs/*.json
rm -f frontend/logs/*.json

echo "🧪 Cleaning up test artifacts..."
rm -rf backend/tests/integration/logs/
rm -f backend/tests/integration/*.db

echo "📦 Cleaning up temporary directories..."
rm -rf EXPERIMENTAL/
rm -rf "C:/"

echo "🔍 Checking for .env files..."
env_files=$(find . -name ".env*" -type f | grep -v ".env.example" | grep -v ".env.sample" | grep -v "node_modules")
if [ ! -z "$env_files" ]; then
    echo "⚠️  Warning: Found .env files:"
    echo "$env_files"
    echo "These should NOT be committed to GitHub!"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Add files: git add ."
echo "3. Commit: git commit -m 'Prepare for production deployment'"
echo "4. Push to GitHub: git push origin main"