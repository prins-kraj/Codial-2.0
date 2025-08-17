@echo off
echo Installing dependencies for Real-Time Chat Website...
echo.

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Failed to install server dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo Failed to install client dependencies
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ All dependencies installed successfully!
echo.
echo Next steps:
echo 1. Start Docker containers: docker-compose up -d
echo 2. Run database migrations: cd server && npm run db:migrate
echo 3. Seed database: cd server && npm run db:seed
echo 4. Start development servers: npm run dev
echo.
pause