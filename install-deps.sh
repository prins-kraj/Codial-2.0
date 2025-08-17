#!/bin/bash

echo "Installing dependencies for Real-Time Chat Website..."
echo

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install root dependencies"
    exit 1
fi

echo
echo "Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install server dependencies"
    exit 1
fi

echo
echo "Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install client dependencies"
    exit 1
fi

cd ..
echo
echo "✅ All dependencies installed successfully!"
echo
echo "Next steps:"
echo "1. Start Docker containers: docker-compose up -d"
echo "2. Run database migrations: cd server && npm run db:migrate"
echo "3. Seed database: cd server && npm run db:seed"
echo "4. Start development servers: npm run dev"
echo