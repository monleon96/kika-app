# KIKA Frontend Developer Guide

Welcome to the KIKA project! This guide will help you understand the project philosophy, architecture, and development workflow.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Philosophy & Design Principles](#philosophy--design-principles)
3. [Architecture Overview](#architecture-overview)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Development Environment Setup](#development-environment-setup)
7. [Development Workflow](#development-workflow)
8. [API Reference](#api-reference)
9. [Current Implementation Status](#current-implementation-status)
10. [Coding Guidelines](#coding-guidelines)
11. [Common Patterns](#common-patterns)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

**KIKA** is a desktop application for visualizing and analyzing nuclear data files (ACE and ENDF formats). It's designed for scientists and engineers working with nuclear data libraries like ENDF/B, JEFF, and TENDL.

### What does KIKA do?

- **Parse and visualize ACE files**: Cross-section plots, angular distributions
- **Parse and visualize ENDF files**: Legendre coefficients, uncertainty data (MF4/MF34)
- **Multi-library comparison**: Compare data from different nuclear libraries on the same plot
- **Publication-quality exports**: Matplotlib-based high-quality exports for scientific papers
- **User authentication**: Email-based registration with verification

---

## Philosophy & Design Principles

### 1. **Hybrid Plotting System**

This is the core design decision of the visualization layer:

| Plotly (Interactive Preview) | Matplotlib (Export) |
|------------------------------|---------------------|
| Fast, real-time updates | High-quality, publication-ready |
| Zoom, pan, hover tooltips | Vector formats (PDF, SVG) |
| Explore data quickly | Up to 1200 DPI |
| Session-based | Final output for papers |

**Why hybrid?**
- Scientists need to explore data interactively (Plotly excels here)
- Final figures for papers need Matplotlib's typographic control
- WYSIWYG: What you configure in Plotly is what you get in Matplotlib export

### 2. **Session-Based File Management**

Files are **NOT** persisted in `localStorage`. This is intentional:
- Avoids quota limits with large nuclear data files
- Prevents stale `file_id` references (backend cache expires)
- Clean state per session (important for guest users)
- Files are re-uploaded each session

### 3. **Two Backend Architecture**

```
┌─────────────┐    ┌─────────────────────┐
│   Frontend  │───▶│   backend-auth      │  (Port 8000)
│    (React)  │    │   - Authentication  │
│             │    │   - User management │
│             │    └─────────────────────┘
│             │
│             │    ┌─────────────────────┐
│             │───▶│   backend-core      │  (Port 8001)
│             │    │   - ACE parsing     │
│             │    │   - ENDF parsing    │
│             │    │   - Plot generation │
└─────────────┘    └─────────────────────┘
```

- **backend-auth**: Authentication, user registration, email verification (deployed on Render)
- **backend-core**: Nuclear data processing using the `kika` Python library (runs locally)

### 4. **Desktop-First with Tauri**

The app is built with Tauri (Rust + WebView) for native desktop experience:
- Native file dialogs
- Direct filesystem access
- Smaller bundle than Electron
- Also works in browser for development

---

## Architecture Overview

### Frontend → Backend Communication

```
Frontend (React)
    │
    ├─── AuthContext ──────▶ backend-auth (8000)
    │        │                    │
    │        │                    ├── POST /register
    │        │                    ├── POST /login
    │        │                    ├── GET /users/{email}
    │        │                    └── POST /password/forgot
    │
    └─── kikaService ──────▶ backend-core (8001)
             │                    │
             │                    ├── POST /api/ace/parse
             │                    ├── POST /api/ace/series
             │                    ├── POST /api/endf/parse
             │                    ├── POST /api/endf/series
             │                    └── POST /api/plot/matplotlib-export
```

### Data Flow for Plotting

```
1. User uploads file
       ↓
2. Frontend sends file content to backend
       ↓
3. Backend parses file, caches it, returns file_id + metadata
       ↓
4. User selects reactions/data to plot
       ↓
5. Frontend requests series data (x, y arrays) using file_id
       ↓
6. Plotly renders interactive plot
       ↓
7. User customizes (colors, scales, labels, etc.)
       ↓
8. For export: Frontend sends config to /api/plot/matplotlib-export
       ↓
9. Backend generates Matplotlib figure, returns base64 image
```

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tauri** | Desktop app wrapper |
| **Material-UI 5** | UI components |
| **React Router 6** | Navigation |
| **React Query** | Server state management |
| **Plotly.js** | Interactive plotting |
| **Zustand** | Local state (future use) |

### Backend (Core)

| Technology | Purpose |
|------------|---------|
| **FastAPI** | API framework |
| **KIKA library** | Nuclear data processing |
| **Matplotlib** | Publication-quality plots |
| **NumPy/SciPy** | Numerical operations |

### Backend (Auth)

| Technology | Purpose |
|------------|---------|
| **FastAPI** | API framework |
| **SQLAlchemy 2.0** | Database ORM |
| **PostgreSQL** | User database |
| **Alembic** | Migrations |
| **Brevo/SMTP** | Email delivery |

---

## Project Structure

```
kika-app/
├── frontend/                    # React + Tauri frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Layout.tsx       # App shell with sidebar
│   │   │   ├── PlotViewer.tsx   # ACE plotting component
│   │   │   ├── ENDFPlotViewer.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── FileWorkspace.tsx
│   │   │
│   │   ├── contexts/            # React contexts
│   │   │   ├── AuthContext.tsx  # User auth state
│   │   │   └── FileWorkspaceContext.tsx  # Loaded files state
│   │   │
│   │   ├── pages/               # Route pages
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ACEViewer.tsx
│   │   │   └── ENDFViewer.tsx
│   │   │
│   │   ├── services/
│   │   │   └── kikaService.ts   # Backend API client
│   │   │
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Helper functions
│   │   ├── App.tsx              # App entry point
│   │   ├── routes.tsx           # Route definitions
│   │   ├── config.ts            # API URLs configuration
│   │   └── theme.ts             # MUI theme
│   │
│   ├── src-tauri/               # Tauri (Rust) native code
│   └── package.json
│
├── backend-core/                # Nuclear data processing server
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── models.py            # Pydantic models
│   │   ├── routers/
│   │   │   ├── ace.py           # ACE endpoints
│   │   │   ├── endf.py          # ENDF endpoints
│   │   │   └── plot.py          # Plot export endpoints
│   │   └── services/
│   │       ├── ace_service.py   # ACE parsing logic
│   │       ├── endf_service.py  # ENDF parsing logic
│   │       └── plot_service.py  # Plot generation
│   └── requirements.txt
│
├── backend-auth/                # Authentication server
│   ├── app.py
│   ├── models.py                # SQLAlchemy models
│   ├── routers/
│   └── alembic/                 # Database migrations
│
├── docs/                        # Documentation
├── setup_workspace.sh           # Environment setup
├── start_dev.sh                 # Start all services
└── README.md
```

---

## Development Environment Setup

### Prerequisites

- **Python 3.12+**
- **Node.js 20 LTS** (via nvm recommended)
- **Rust** (for Tauri, optional for browser-only dev)

### First-Time Setup

```bash
# 1. Clone and enter the repository
cd kika-app

# 2. Run the setup script (creates venv, installs dependencies)
./setup_workspace.sh

# 3. Activate the Python environment
source venv/bin/activate

# 4. Install frontend dependencies
cd frontend
npm install
cd ..
```

### Starting Development Servers

**Option A: All-in-one script (recommended)**
```bash
./start_dev.sh
```

This starts:
- backend-auth on `http://localhost:8000`
- backend-core on `http://localhost:8001`
- frontend on `http://localhost:1420`

**Option B: Manual (separate terminals)**
```bash
# Terminal 1: Auth backend
cd backend-auth
source ../venv/bin/activate
uvicorn app:app --reload --port 8000

# Terminal 2: Core backend
cd backend-core
source ../venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Running with Tauri (Desktop App)

```bash
cd frontend
npm run tauri:dev
```

> Note: Requires display server. For WSL without display, use browser mode.

---

## Development Workflow

### Adding a New Feature

1. **Understand the data flow**
   - What data does the feature need?
   - Does it need a new backend endpoint?

2. **Backend first (if needed)**
   - Add Pydantic models in `backend-core/app/models.py`
   - Add endpoint in appropriate router
   - Test with curl or API client

3. **Service layer**
   - Add TypeScript types in `frontend/src/services/kikaService.ts`
   - Add fetch function for the new endpoint

4. **UI components**
   - Create/modify components in `frontend/src/components/`
   - Use Material-UI components for consistency

5. **Connect to page**
   - Wire up in the appropriate page (`pages/*.tsx`)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit often
git add .
git commit -m "feat: add specific feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Convention

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, no code change
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

---

## API Reference

### backend-core (Port 8001)

#### ACE Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ace/parse` | POST | Parse ACE file, return metadata |
| `/api/ace/series` | POST | Get x/y data for plotting |
| `/api/ace/plot` | POST | Generate static plot image |
| `/api/ace/upload` | POST | Multipart file upload |

#### ENDF Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/endf/parse` | POST | Parse ENDF file, return metadata |
| `/api/endf/series` | POST | Get Legendre/uncertainty data |

#### Plot Export Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plot/matplotlib-export` | POST | ACE Matplotlib export |
| `/api/plot/endf/matplotlib-export` | POST | ENDF Matplotlib export |

#### Common Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |
| `/api/detect-file-type` | POST | Auto-detect file type |

### Request/Response Examples

**Parse ACE File:**
```typescript
// Request
const response = await fetch('http://localhost:8001/api/ace/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_content: '...file content...',
    file_name: 'U235.ace'
  })
});

// Response
{
  "file_id": "abc123",
  "zaid": "92235.80c",
  "atomic_weight_ratio": 233.0248,
  "temperature": 293.6,
  "available_reactions": [1, 2, 4, 16, 17, 18, 102],
  "angular_reactions": [2, 4, 16],
  "has_angular_distributions": true,
  "energy_grid_size": 35234
}
```

**Get Series Data:**
```typescript
// Request
{
  "file_id": "abc123",
  "file_name": "U235.ace",
  "plot_type": "xs",
  "mt_number": 2
}

// Response
{
  "series_id": "xyz789",
  "label": "92235.80c MT2",
  "x": [1e-5, 1e-4, ...],
  "y": [20.5, 19.8, ...],
  "x_unit": "Energy (MeV)",
  "y_unit": "Cross Section (barns)",
  "metadata": {...},
  "suggested": {
    "log_x": true,
    "log_y": true,
    ...
  }
}
```

---

## Current Implementation Status

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Project setup | ✅ | Vite + Tauri configured |
| Authentication | ✅ | Login, register, guest mode |
| File upload | ✅ | Drag-drop, Tauri native dialogs |
| ACE parsing | ✅ | Full metadata extraction |
| ACE cross-section plots | ✅ | Interactive Plotly |
| ACE angular distributions | ✅ | With energy selection |
| ENDF parsing | ✅ | MF4/MF34 support |
| ENDF Legendre plots | ✅ | With uncertainty bands |
| Matplotlib export | ✅ | Publication-quality |
| Multi-series plots | ✅ | Compare multiple files/reactions |
| Plot customization | ✅ | Colors, scales, labels, etc. |


### 📋 Future Ideas

- Deploy app as standalone Tauri package
- User preferences persistence
- Covariance data plotting
- Proper file management with local DB
- Material manager

---

## Coding Guidelines

### TypeScript

```typescript
// Use explicit types
interface SeriesConfig {
  fileId: string;
  mtNumber: number;
  color: string;
}

// Prefer const assertions for constants
const REACTION_TYPES = ['xs', 'angular'] as const;
type ReactionType = typeof REACTION_TYPES[number];

// Use async/await over .then()
async function fetchData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
}
```

### React Components

```tsx
// Functional components with typed props
interface PlotViewerProps {
  files: LoadedACEFile[];
  onSeriesAdd: (series: SeriesConfig) => void;
}

export const PlotViewer: React.FC<PlotViewerProps> = ({ files, onSeriesAdd }) => {
  // Use hooks at the top
  const [loading, setLoading] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  
  // Memoize expensive computations
  const processedData = useMemo(() => {
    return files.map(f => processFile(f));
  }, [files]);
  
  // useCallback for handlers passed to children
  const handleClick = useCallback(() => {
    // ...
  }, [dependency]);
  
  return (
    // ...
  );
};
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `PlotViewer.tsx`)
- Utilities: `camelCase.ts` (e.g., `fileDetection.ts`)
- Types: `camelCase.ts` in `types/` folder
- Services: `camelCase.ts` with `Service` suffix

### Imports Order

```typescript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Box, Button } from '@mui/material';
import Plot from 'react-plotly.js';

// 3. Local imports (absolute paths preferred)
import { useAuth } from '../contexts/AuthContext';
import { fetchSeriesData } from '../services/kikaService';
import type { SeriesConfig } from '../types/plot';
```

---

## Common Patterns

### Using the File Workspace Context

```tsx
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';

function MyComponent() {
  const { files, addFiles, getFilesByType } = useFileWorkspace();
  
  // Get only ACE files
  const aceFiles = getFilesByType('ace');
  
  // Add new files
  const handleUpload = async (fileList: FileList) => {
    const filesData = await Promise.all(
      Array.from(fileList).map(async file => ({
        name: file.name,
        path: file.name,
        content: await file.text(),
      }))
    );
    await addFiles(filesData);
  };
}
```

### Making Backend Requests

```typescript
import { fetchSeriesData, type SeriesRequest } from '../services/kikaService';

async function loadPlotData(fileId: string, mt: number) {
  const request: SeriesRequest = {
    file_id: fileId,
    file_name: 'cached',  // Name stored in backend cache
    plot_type: 'xs',
    mt_number: mt,
  };
  
  const data = await fetchSeriesData(request);
  return data;
}
```

### Handling Tauri vs Browser

```tsx
const isTauri = '__TAURI__' in window;

async function selectFiles() {
  if (isTauri) {
    // Use Tauri's native file dialog
    const { open } = await import('@tauri-apps/api/dialog');
    const { readTextFile } = await import('@tauri-apps/api/fs');
    
    const selected = await open({ multiple: true });
    // ... process files
  } else {
    // Use HTML file input
    fileInputRef.current?.click();
  }
}
```

### Creating Plotly Charts

```tsx
import Plot from 'react-plotly.js';

function MyChart({ seriesData }) {
  const traces = seriesData.map(series => ({
    x: series.x,
    y: series.y,
    type: 'scatter',
    mode: 'lines',
    name: series.label,
  }));
  
  const layout = {
    title: 'Cross Section',
    xaxis: { title: 'Energy (MeV)', type: 'log' },
    yaxis: { title: 'Cross Section (barns)', type: 'log' },
  };
  
  return <Plot data={traces} layout={layout} />;
}
```

---

## Troubleshooting

### Backend not responding

```bash
# Check if services are running
curl http://localhost:8000/healthz  # Auth
curl http://localhost:8001/healthz  # Core

# Check logs in terminal where you started the services
```

### "Failed to parse ACE/ENDF file"

- Ensure the `kika` library is installed: `pip list | grep kika`
- Check file format is correct
- Check backend logs for detailed error

### Tauri build fails

```bash
# Ensure Rust is installed
rustc --version

# Update Tauri CLI
cd frontend
npm install @tauri-apps/cli@latest
```

### CORS errors

The backend-core is configured for these origins:
- `http://localhost:1420` (Vite)
- `http://localhost:5173` (Vite alternate)
- `tauri://localhost` (Tauri)

If using a different port, add it to `backend-core/app/main.py`.

### File_id not found

The backend caches parsed files in memory. If the backend restarts, all `file_id` references become invalid. Re-upload the files.

---

## Useful Commands

```bash
# Start everything
./start_dev.sh

# Type checking
cd frontend && npm run type-check

# Linting
cd frontend && npm run lint

# Build for production
cd frontend && npm run build

# Build Tauri app
cd frontend && npm run tauri:build
```

---

## Getting Help

- Check existing documentation in `/docs/`
- Look at existing implementations in similar components
- Backend API docs: Run backend and visit `http://localhost:8001/docs`

---

## Summary for Quick Start

1. Run `./setup_workspace.sh` (first time only)
2. Run `./start_dev.sh`
3. Open `http://localhost:1420` in browser
4. Login as guest or create account
5. Upload ACE/ENDF files
6. Start plotting!

Welcome to the team! 🎉
