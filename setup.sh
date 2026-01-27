#!/usr/bin/env bash

echo "🚀 Setting up Mixpanel E2E Testing Suite..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
pnpm run install-browsers

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📝 Setting up environment file..."
    cp .env.staging .env.local
    echo "✅ Created .env.local - Please update the URLs to match your environment"
else
    echo "✅ .env.local already exists"
fi

# Create test results directory
mkdir -p test-results/screenshots

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env.local with your actual URLs"
echo "2. Run tests with: pnpm run test:staging"
echo "3. Check test-results/ folder for HTML reports"
echo ""
echo "🧪 Available commands:"
echo "  pnpm run test:staging     - Test on staging environment"
echo "  pnpm run test:production  - Test on production environment"
echo "  pnpm run test:headed      - Run with visible browser"
echo "  pnpm run test:debug       - Interactive debug mode"