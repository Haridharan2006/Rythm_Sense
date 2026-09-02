"""
AcoustiGuard / Rythm Sense - Lightweight Python Inference Backend (FastAPI)

This server acts as the API bridge between the React frontend and the Python ML pipeline.
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import logging

from inference import run_ml_pipeline, DEFAULT_THRESHOLDS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("acoustiguard_backend")

app = FastAPI(
    title="AcoustiGuard ML Inference Engine",
    description="Acoustic Anomaly Detection API utilizing Log-Mel Spectrograms, TCN Predictive Coding, and Conformal Calibration.",
    version="0.1.0"
)

# Configure CORS for local development with Vite frontend (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"  # Open for development convenience
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health status check for system readiness monitoring in the frontend sidebar."""
    return {
        "status": "ok",
        "engine": "AcoustiGuard ML Engine v0.1",
        "mock_mode": False,
        "supported_machines": list(DEFAULT_THRESHOLDS.keys())
    }


@app.post("/predict")
async def predict(
    file: Optional[UploadFile] = File(None),
    machine_id: str = Form(...)
):
    """
    Main inference endpoint.
    
    Receives:
    - file: WAV audio file (optional for preset clips, required for custom recordings)
    - machine_id: Selected target machine identifier (fan_id00, fan_id02, valve_id00, valve_id02)
    
    Executes ML Pipeline:
    WAV Audio -> Log-Mel Spectrogram -> TCN Model -> Prediction Error -> Conformal Thresholding -> Decision
    """
    start_time = time.time()
    
    logger.info(f"Received inference request for machine_id: {machine_id}")

    # Validate file format if provided
    file_bytes = None
    filename = f"{machine_id}_recording.wav"
    
    if file is not None:
        filename = file.filename or filename
        if not filename.lower().endswith(".wav"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format '{filename}'. AcoustiGuard requires uncompressed 16kHz WAV audio format (.wav)."
            )
        file_bytes = await file.read()
        logger.info(f"Loaded uploaded WAV file: {filename} ({len(file_bytes)} bytes)")

    try:
        # Run ML Pipeline
        result = run_ml_pipeline(file_bytes=file_bytes, filename=filename, machine_id=machine_id)
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        result["inferenceTimeMs"] = elapsed_ms
        
        logger.info(f"Inference complete in {elapsed_ms}ms. Decision for {machine_id}: {result['decision']} (Score: {result['anomalyScore']:.4f}, Threshold: {result['threshold']:.4f})")
        
        return result

    except Exception as e:
        logger.error(f"Execution error during inference: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal inference engine failure: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
