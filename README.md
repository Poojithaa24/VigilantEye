# VigilantEye

## Overview

VigilantEye is a full-stack application combining backend AI models and a React-based frontend for real-time video analysis, live CCTV monitoring, and alert management.

## Features

- AI-based video detection and processing using models (`best.pt`, `best_lstm_mobilenet_model.h5`)
- Real-time live CCTV video feeds and controls
- Video upload and analysis tools
- Dashboard with alerts, statistics, and video processing status
- Integration with Supabase for backend services and SMS alerts

## Project Structure

- `Backend/`: Python backend with AI models, API server, and scripts
- `frontend/`: React/TypeScript frontend with UI components, styles, and Supabase functions

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Supabase CLI
- Twilio API keys
- ffmpeg from https://www.gyan.dev/ffmpeg/builds/

### Requirements installation

pip install -r requirements.txt

### Backend running

```bash
cd Backend
python server.py
```

### Frontend running

```bash
cd frontend
npm install // for running first time
npm run dev
```
