#!/bin/bash
# ==============================================================================
# Automated Deployment Script for AWS EC2 / Lightsail (Ubuntu 22.04 / 24.04 LTS)
# AI-Powered HIV ART Regimen Selector Portal
# ==============================================================================

set -e

echo ">>> [1/6] Updating system packages and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv git curl nginx build-essential

echo ">>> [2/6] Installing Node.js (v20 LTS)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo ">>> [3/6] Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ">>> [4/6] Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

echo ">>> [5/6] Training ML models (if not already cached)..."
python ml/train.py

echo ">>> [6/6] Setting up systemd background service (auto-restart on reboot)..."
APP_DIR=$(pwd)
USER_NAME=$(whoami)

sudo bash -c "cat > /etc/systemd/system/hiv-app.service << EOF
[Unit]
Description=HIV ART Regimen Selector Portal
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$APP_DIR
Environment=\"PATH=$APP_DIR/venv/bin\"
ExecStart=$APP_DIR/venv/bin/python run_app.py --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable hiv-app
sudo systemctl restart hiv-app

echo "=============================================================================="
echo " Deployment Complete!"
echo " Service Status: $(sudo systemctl is-active hiv-app)"
echo " Access your application at: http://<YOUR_AWS_PUBLIC_IP>:8000"
echo "=============================================================================="
