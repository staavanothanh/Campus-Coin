@echo off
setlocal
cd /d "%~dp0"

set "API_URL=http://127.0.0.1:3000/api/v1/health"
set "WEB_URL=http://127.0.0.1:5173/"

if not exist package.json (
  echo Khong tim thay package.json. Hay dat file nay trong thu muc goc Campus Coin.
  goto FAILED
)

if not exist node_modules\ (
  echo Chua co node_modules. Mo terminal tai thu muc nay va chay npm ci truoc.
  goto FAILED
)

if not exist .env (
  echo Chua co file .env. Tao .env tu .env.example va dien cau hinh local.
  goto FAILED
)

where curl.exe >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay curl.exe tren Windows. Khong the kiem tra dich vu local.
  goto FAILED
)

curl.exe --silent --fail --max-time 2 "%API_URL%" >nul 2>nul
if not errorlevel 1 goto API_READY

netstat -ano -p tcp | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo Cong 3000 dang duoc su dung nhung khong phai Campus Coin API san sang.
  echo Hay dong dung ung dung dang dung cong nay roi chay lai. File nay khong tu tat tien trinh.
  goto FAILED
)

echo Dang khoi dong API...
start "Campus Coin API" /D "%CD%" cmd /k npm run dev:api
set /a API_TRIES=0

:WAIT_API
curl.exe --silent --fail --max-time 2 "%API_URL%" >nul 2>nul
if not errorlevel 1 goto API_READY
set /a API_TRIES+=1
if %API_TRIES% GEQ 30 goto API_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_API

:API_READY
echo API san sang tai http://127.0.0.1:3000
goto START_WEB

:API_FAILED
echo API chua san sang. Xem cua so Campus Coin API de biet buoc cau hinh bi loi.
echo Khong mo giao dien vi API chua hoat dong.
goto FAILED

:START_WEB
curl.exe --silent --fail --max-time 2 "%WEB_URL%" >nul 2>nul
if not errorlevel 1 goto WEB_READY

netstat -ano -p tcp | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 (
  echo Cong 5173 dang duoc su dung nhung khong phai giao dien Campus Coin san sang.
  echo Hay dong dung ung dung dang dung cong nay roi chay lai. File nay khong tu tat tien trinh.
  goto FAILED
)

echo Dang khoi dong giao dien...
start "Campus Coin Web" /D "%CD%" cmd /k npm run dev
set /a WEB_TRIES=0

:WAIT_WEB
curl.exe --silent --fail --max-time 2 "%WEB_URL%" >nul 2>nul
if not errorlevel 1 goto WEB_READY
set /a WEB_TRIES+=1
if %WEB_TRIES% GEQ 30 goto WEB_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_WEB

:WEB_READY
echo Giao dien san sang. Dang mo trinh duyet...
start "" "%WEB_URL%"
echo.
echo Campus Coin: %WEB_URL%
echo API: %API_URL%
echo Dong cua so API va Web de dung hai dich vu.
goto FINISHED

:WEB_FAILED
echo Khong mo duoc giao dien tren cong 5173. Xem cua so Campus Coin Web.
goto FAILED

:FAILED
echo.
pause
exit /b 1

:FINISHED
exit /b 0
