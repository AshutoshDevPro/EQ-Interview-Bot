# Interview Coach AI

A full-stack interview coaching application with AI-powered interview generation, real-time feedback, emotion detection, and resume review support.

## Key Features
- React + Vite frontend for an interactive interview experience
- Express.js backend for authentication, interview session management, and Gemini integration
- Firebase authentication and storage support
- Python FastAPI service for emotion detection and face recognition
- Resume upload, interview history, and progress tracking

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, TypeScript
- Backend: Express.js, TypeScript, Drizzle ORM
- Python Service: FastAPI, Uvicorn
- Authentication: Firebase
- AI: Gemini API

## Prerequisites
- Node.js v18+ and npm
- Python 3.11 for the `python-service`
- Firebase project credentials
- Gemini API key

## Environment Setup

1. Create a `.env` file in the project root (`Interview-Coach-AI/Interview-Coach-AI/`) with the following values:

```env
GEMINI_API_KEY=<your-gemini-api-key>
VITE_FIREBASE_API_KEY=<firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-sender-id>
VITE_FIREBASE_APP_ID=<firebase-app-id>
GEMINI_MODEL=gemini-2.5-flash
```

> Without valid Firebase and Gemini credentials, authentication and interview generation will not work.

## Install Dependencies

```powershell
cd "c:\B.Tech\Btech 2 year\minor Project\Interview-Final\website\Interview-Coach-AI\Interview-Coach-AI"
npm install
```

## Run the Application

### Option 1: Full stack development mode

```powershell
cd "...\Interview-Coach-AI\Interview-Coach-AI"
npm run dev
```

This starts the Express server and Vite frontend together.

### Option 2: Frontend only

```powershell
cd "...\Interview-Coach-AI\Interview-Coach-AI"
npm run dev:client
```

This starts only the Vite frontend on port 5000.

## Python Service (Emotion Detection)

The Python service runs separately and provides emotion detection and face recognition support.

```powershell
cd "...\Interview-Coach-AI\Interview-Coach-AI\python-service"

# If a virtual environment already exists
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# If no venv exists or you need to recreate it
py -3.11 -m venv .venv
.\.venv\Scripts\activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service starts at `http://localhost:8000`.

## Available npm Scripts

- `npm run dev` – Start backend + frontend in development mode
- `npm run dev:client` – Start frontend only on port 5000
- `npm run build` – Build the production app
- `npm run build:gh-pages` – Build the frontend into `docs/` for GitHub Pages
- `npm run start` – Run built production server
- `npm run check` – TypeScript type check
- `npm run db:push` – Push Drizzle ORM schema changes

## Project Structure

```
Interview-Coach-AI/
├── client/              # React frontend source
├── server/              # Express backend source
├── python-service/      # FastAPI emotion detection service
├── script/              # Build scripts
├── shared/              # Shared schema and types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                 # Local environment variables
```

## Notes
- Ensure ports `5000` and `8000` are free before starting the app.
- Firebase must be configured correctly for auth and file upload features.
- The Python service is optional but required for emotion detection.

## License
MIT
