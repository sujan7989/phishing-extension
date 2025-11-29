#!/bin/bash
# Build script for Render.com

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Checking for model file..."
if [ ! -f "phishing_model.pkl" ]; then
    echo "Model file not found! Training model..."
    python train_model.py
else
    echo "Model file found!"
fi

echo "Build complete!"
