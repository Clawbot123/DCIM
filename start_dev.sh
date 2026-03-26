#!/bin/bash
echo "============================================"
echo " DCIM Pro - Development Server Startup"
echo "============================================"

# Backend setup
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q

echo "Running Django migrations..."
python manage.py migrate

echo "Creating superuser and demo data..."
python manage.py seed_data

# Start backend in background
echo "Starting Django backend on http://localhost:8000"
python manage.py runserver &
BACKEND_PID=$!

# Frontend
cd ../frontend
echo "Starting React frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo " DCIM Pro is running!"
echo ""
echo " Backend:  http://localhost:8000"
echo " Frontend: http://localhost:5173"
echo " API Docs: http://localhost:8000/api/docs/"
echo " Admin:    http://localhost:8000/admin/"
echo ""
echo " Login: admin / admin123"
echo " Press Ctrl+C to stop"
echo "============================================"

wait $BACKEND_PID $FRONTEND_PID
