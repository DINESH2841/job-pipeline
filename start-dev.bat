@echo off
REM Start Backend and Frontend in separate terminal windows on Windows

echo 🚀 Starting Job Pipeline Development Environment
echo ================================================
echo.
echo Backend will run on: http://localhost:4000
echo Frontend will run on: http://localhost:5173
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not installed. Please install Node.js and npm.
    pause
    exit /b 1
)

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Start backend in new terminal
echo 🔧 Starting backend in new terminal...
start cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in new terminal
echo 🎨 Starting frontend in new terminal...
start cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers started in separate terminal windows!
echo.
echo Open your browser and go to: http://localhost:5173
echo Backend will be at: http://localhost:4000
echo.
echo Close the terminal windows to stop the servers.
pause
