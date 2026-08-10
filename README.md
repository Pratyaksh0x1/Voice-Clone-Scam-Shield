# Voice Clone Scam Shield

A state-of-the-art web platform for detecting fraudulent, synthetic, and cloned audio recordings in real-time. This project is a production-grade commercial application featuring a high-performance Next.js frontend, a FastAPI backend, and a PyTorch neural network capable of detecting AI-generated voices.


### 🚀 Live 

👉 **[Try Live](https://voice-clone-scam-shield-eight.vercel.app/)**

Experience the Voice Clone Scam Shield live and analyze synthetic/AI-generated voices in real time.


![title](images/Audio%20deepfake%20fraud%20detection%20system.png)

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Benchmark Dataset](#benchmark-dataset)
- [License](#license)

## Overview

Voice cloning technology has made it trivial to replicate voices with just a few seconds of audio, fueling a billion-dollar fraud industry. Human operators and traditional security measures cannot reliably distinguish synthetic voices from real ones.

This platform solves this by analyzing the micro-acoustic signatures and artifacts left behind by generative models. Utilizing a deep neural network (ResNet18 + Bi-GRU + Attention), it detects synthetic audio with high accuracy, including high-quality deepfakes like ElevenLabs. 

The system features robust file uploads with timeline breakdowns and real-time streaming WebSocket detection.

## Architecture

- **Frontend (Next.js 14 App Router):** 
  - Styled with Tailwind CSS and `shadcn/ui` using a dark "cybersecurity command center" aesthetic.
  - Interactive 3D particle waveform using `React Three Fiber`.
  - Integrates `wavesurfer.js` for granular audio timeline visualization.
- **Backend (FastAPI):**
  - Serves REST endpoints for file uploads (`/api/detect`) and scan history.
  - Manages a WebSocket endpoint (`/api/live`) for real-time audio chunk streaming.
  - Fully integrated with **PostgreSQL** (e.g. Neon Serverless Postgres) via SQLAlchemy.
- **Machine Learning Engine:**
  - Pre-trained ResNet18 backbone with Bi-GRU.
  - Fine-tuned specifically to detect ultra-realistic deepfakes (e.g., ElevenLabs) alongside standard TTS.
  - Native `soundfile` parsing for robust multi-format audio handling.

## Key Features

- **3D Landing Page:** Immersive, animated introductory experience explaining the threat and solution with embedded background video.
- **File Upload Analysis (`/detect`):** Upload `.wav`, `.flac`, `.mp3`, or `.m4a` files. Get an overall verdict, confidence score, and a timeline breakdown showing which specific 4-second segments contain synthetic artifacts.
- **Live Intercept (`/live`):** Capture microphone audio directly from the browser and stream it over WebSockets to receive a live, rolling confidence matrix chart and a scrolling neural processing terminal.
- **Hindi NLP Integration:** The Live Monitor features explicit `hi-IN` NLP transcription support that perfectly captures spoken Hindi in Indian scam calls.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pratyaksh0x1/Voice-Clone-Scam-Shield.git
   cd Voice-Clone-Scam-Shield
   ```

2. **Set up the PostgreSQL Database:**
   - Create a `.env` file in the root directory.
   - Add your connection string (ensure it uses `postgresql://` and includes `?sslmode=require` if using Neon):
     ```env
     DATABASE_URL="postgresql://user:password@hostname:port/dbname?sslmode=require"
     ```

3. **Set up the Backend:**
   ```bash
   # Create a virtual environment and install dependencies using uv
   uv venv backend/.venv
   
   # Activate the virtual environment
   # On Windows:
   backend\.venv\Scripts\activate
   # On macOS/Linux:
   source backend/.venv/bin/activate
   
   # Install dependencies
   uv pip install -r backend/requirements.txt psycopg2-binary python-dotenv
   ```

4. **Set up the Frontend:**
   ```bash
   cd frontend
   npm install
   ```

## Usage

You need to run both the backend and frontend servers simultaneously.

### 1. Start the Backend API
In a new terminal window, from the root directory:
```bash
# Ensure the virtual environment is activated
backend\.venv\Scripts\activate

# Start FastAPI
uvicorn backend.main:app --reload --port 8000
```
*Note: The API will automatically sync your PostgreSQL database tables on boot.*

### 2. Start the Frontend Application
In another terminal window, from the `frontend` directory:
```bash
cd frontend
npm run dev
```
The web platform will be available at `http://localhost:3000`.

## Project Structure

```text
Voice-Clone-Scam-Shield/
├── backend/            # FastAPI Application & ML Inference
│   ├── main.py         # API entrypoint and routes
│   ├── model_service.py# PyTorch inference and Adaptive OOD logic
│   ├── database.py     # PostgreSQL configuration & dotenv loading
│   ├── models.py       # SQLAlchemy database schemas
│   └── train.py        # Local PyTorch fine-tuning script
├── frontend/           # Next.js Web Application
│   ├── public/         # Static assets and HUD background videos
│   ├── src/app/        # Next.js Pages (Landing, Detect, Live)
│   └── package.json
├── indian-audio-benchmark/ # Curated real vs fake testing structures
├── scripts/            # Build and generation scripts
├── models/             # Trained PyTorch model weights (.pth)
└── README.md           
```

## Benchmark Dataset

We have included a scaffolded directory at `indian-audio-benchmark/` specifically designed to test the platform against Hindi and Indian English deepfakes. It includes pre-generated Synthetic TTS audio files as well as high-quality ElevenLabs samples for immediate demo testing.

You can also download extensive datasets from platforms like Kaggle, place them in the respective `real` and `fake` folders, and easily fine-tune the model using the included `train.py` script:
```bash
uv run python backend/train.py
```

## License

This project is licensed under the terms of the license included in the repository.
