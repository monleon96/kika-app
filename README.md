# KIKA App

This repository contains the KIKA application, organized into frontend and backend services.

## Project Structure

*   **`frontend/`**: The desktop application built with Tauri and React.
*   **`backend-auth/`**: Authentication service (FastAPI).
*   **`backend-core/`**: Core processing service (FastAPI) that interfaces with the KIKA library.
*   **`setup_workspace.sh`**: Script to set up the development environment.

## Setup

1.  **Prerequisites**: Ensure you have Python 3.12+, Node.js, and Rust installed.
2.  **Environment Setup**:
    Run the setup script to create a virtual environment and install dependencies (including the editable install of the `kika` library).

    ```bash
    ./setup_workspace.sh
    ```

3.  **Activate Environment**:
    ```bash
    source venv/bin/activate
    ```

## Running the Application

You will need to run the backend services and the frontend concurrently.

### 1. Start Authentication Backend
```bash
cd backend-auth
uvicorn app:app --reload --port 8000
```

### 2. Start Core Backend
```bash
cd backend-core
uvicorn app.main:app --reload --port 8001
```

### 3. Start Frontend
```bash
cd frontend
npm install  # If not already installed
npm run tauri dev
```

## Notes

*   The `kika` library is installed in editable mode from `/home/MONLEON-JUAN/kika`. Changes in that directory will be immediately reflected in `backend-core`.
*   Configuration for the frontend is in `frontend/src/config.ts`.
