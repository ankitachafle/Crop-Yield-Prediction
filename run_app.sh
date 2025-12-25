#!/bin/bash
echo "Starting Crop Yield Prediction App..."

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "Installing requirements..."
pip install -r backend/requirements.txt

echo "Starting Backend Server..."
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
