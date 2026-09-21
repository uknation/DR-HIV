import os
import sys
import subprocess
import argparse

def train_models_if_missing():
    """Runs training if metrics.json or models are missing."""
    metrics_path = os.path.join("ml", "models", "metrics.json")
    if not os.path.exists(metrics_path):
        print("ML Models or performance metrics missing. Running training pipeline...")
        # Execute training script
        try:
            # Add ml directory to python path
            env = os.environ.copy()
            env["PYTHONPATH"] = os.path.abspath("ml") + os.pathsep + env.get("PYTHONPATH", "")
            subprocess.run([sys.executable, "ml/train.py"], env=env, check=True)
            print("ML models successfully trained and serialized.")
        except subprocess.CalledProcessError as e:
            print(f"Error occurred during model training: {e}")
            sys.exit(1)
    else:
        print("ML models already trained and serialized (metrics.json found).")

def build_frontend_if_missing():
    """Builds frontend production assets if dist/ folder is missing."""
    dist_path = os.path.join("frontend", "dist")
    if not os.path.exists(dist_path):
        print("Frontend compiled production assets (frontend/dist) missing.")
        node_modules = os.path.join("frontend", "node_modules")
        if os.path.exists(node_modules):
            print("Compiling frontend assets via 'npm run build'...")
            try:
                # Run npm run build inside frontend
                subprocess.run("npm run build", shell=True, cwd="frontend", check=True)
                print("Frontend assets compiled successfully.")
            except subprocess.CalledProcessError as e:
                print(f"Warning: Failed to compile frontend assets: {e}")
                print("Make sure you run 'npm install' and 'npm run build' inside 'frontend' folder.")
        else:
            print("Warning: frontend/node_modules not found. Please run 'npm install' inside 'frontend' first.")
    else:
        print("Frontend production assets found (frontend/dist).")

import socket

def find_available_port(host, preferred_port, max_tries=20):
    """Finds the first open port starting from preferred_port."""
    for p in range(preferred_port, preferred_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.2)
            result = s.connect_ex((host, p))
            if result != 0:
                return p
    return preferred_port

def start_backend_server(host, port, reload):
    """Launches the Uvicorn FastAPI server with automatic open port detection."""
    actual_port = find_available_port(host, port)
    if actual_port != port:
        print(f"Notice: Port {port} is currently busy. Starting application on port {actual_port} instead.")
        
    print(f"\n=======================================================")
    print(f"  HIV ART Regimen Selector Portal Ready               ")
    print(f"  Portal URL: http://{host}:{actual_port}             ")
    print(f"=======================================================\n")
    
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=host, 
        port=actual_port, 
        reload=reload, 
        app_dir="backend"
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI-Powered HIV ART Regimen Selector Launcher")
    parser.add_argument("--host", default="127.0.0.1", help="Host address to bind the server")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the application")
    parser.add_argument("--reload", action="store_true", help="Enable uvicorn hot-reload (development only)")
    parser.add_argument("--force-train", action="store_true", help="Force retrain ML models on startup")
    
    args = parser.parse_args()
    
    # Change directory to project root if run from elsewhere
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    if args.force_train:
        # Delete metrics.json to trigger retraining
        metrics_path = os.path.join("ml", "models", "metrics.json")
        if os.path.exists(metrics_path):
            os.remove(metrics_path)
            
    # Step 1: Ensure models are trained
    train_models_if_missing()
    
    # Step 2: Ensure frontend is built
    build_frontend_if_missing()
    
    # Step 3: Run backend
    start_backend_server(args.host, args.port, args.reload)
