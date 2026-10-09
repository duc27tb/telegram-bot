@echo off
title TelePulse - Khoi Dong He Thong
echo ===================================================
echo   KHOI DONG HE THONG TELEPULSE (BACKEND + FRONTEND)
echo ===================================================

echo [1/2] Dang khoi dong Backend FastAPI (Port 8000)...
start "TelePulse Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Dang khoi dong Frontend React Vite (Port 5173)...
start "TelePulse Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   DA KHOI DONG THANH CONG!
echo   - Backend API: http://localhost:8000
echo   - Frontend UI: http://localhost:5173
echo ===================================================
pause
