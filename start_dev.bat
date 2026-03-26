@echo off
echo ============================================
echo  DCIM Pro - Development Server Startup
echo ============================================

echo.
echo [1/3] Setting up Django backend...
cd backend

IF NOT EXIST "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo Running Django migrations...
python manage.py migrate

echo Creating superuser and demo data...
python manage.py seed_data

echo.
echo [2/3] Starting Django backend on http://localhost:8000
start "Django Backend" cmd /k "venv\Scripts\activate.bat && python manage.py runserver"

cd ..\frontend

echo.
echo [3/3] Starting React frontend on http://localhost:5173
start "React Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo  DCIM Pro is starting!
echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API Docs: http://localhost:8000/api/docs/
echo  Admin:    http://localhost:8000/admin/
echo.
echo  Login: admin / admin123
echo ============================================
pause
