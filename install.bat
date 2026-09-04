@echo off
echo Installing ViewSync dependencies...
echo.

echo Installing server dependencies...
npm install

echo.
echo Installing client dependencies...
cd client
npm install
cd ..

echo.
echo Installation complete!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo This will start both the backend (port 5000) and frontend (port 3000)
pause
