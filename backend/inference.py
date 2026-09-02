"""
AcoustiGuard ML Pipeline Module

This module defines the modular integration points for:
- Person A: Log-Mel Audio Preprocessing (librosa / torchaudio)
- Person B: TCN Predictive Coding Model (PyTorch / ONNX)
- Person C: Machine-Specific Conformal Thresholding & Decision

Replace the placeholder preprocessing and dummy tensor passes below with the trained model weights.
"""

import math
import random
import numpy as np
from typing import Dict, Any, Optional

# Per-Machine Calibrated Thresholds (supplied by Person C)
DEFAULT_THRESHOLDS: Dict[str, float] = {
    "fan_id00": 0.0210,
    "fan_id02": 0.0205,
    "valve_id00": 0.0305,
    "valve_id02": 0.0352,
}

# Machine Metadata Mapping
MACHINE_METADATA: Dict[str, Dict[str, str]] = {
    "fan_id00": {
        "type": "Fan",
        "label": "Fan — fan_id00 (Industrial HVAC Blower #00)",
        "behavior": "Periodic / continuous acoustic behavior",
    },
    "fan_id02": {
        "type": "Fan",
        "label": "Fan — fan_id02 (Cooling Tower Fan #02)",
        "behavior": "Periodic / continuous acoustic behavior",
    },
    "valve_id00": {
        "type": "Valve",
        "label": "Valve — valve_id00 (High-Pressure Solenoid Valve #00)",
        "behavior": "Event-driven / burst-like acoustic behavior",
    },
    "valve_id02": {
        "type": "Valve",
        "label": "Valve — valve_id02 (Pneumatic Actuator Valve #02)",
        "behavior": "Event-driven / burst-like acoustic behavior",
    },
}


# ====================================================================
# PERSON A: LOG-MEL PREPROCESSING STUB
# ====================================================================
def preprocess_log_mel(file_bytes: Optional[bytes], num_mel_bins: int = 64, num_frames: int = 100) -> Dict[str, Any]:
    """
    Transforms raw WAV audio bytes into a 64-bin Log-Mel Spectrogram.
    
    PERSON A INTEGRATION POINT:
    Replace dummy matrix below with torchaudio or librosa:
        y, sr = librosa.load(io.BytesIO(file_bytes), sr=16000)
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64, n_fft=1024, hop_length=160)
        log_mel = librosa.power_to_db(mel_spec, ref=np.max)
    """
    time_axis = [round(i * 0.1, 1) for i in range(num_frames)]
    freq_axis = [int(50 + (i / (num_mel_bins - 1)) * 7950) for i in range(num_mel_bins)]

    # Generate structured baseline energy grid
    data = []
    for f in range(num_mel_bins):
        row = []
        freq_val = freq_axis[f]
        for t in range(num_frames):
            time_val = time_axis[t]
            val = 0.05
            # Harmonic energy bands around 120Hz, 360Hz, 600Hz
            if abs(freq_val - 120) < 60 or abs(freq_val - 360) < 80:
                val += 0.55 + 0.1 * math.sin(time_val * 4)
            row.append(min(1.0, max(0.0, round(val, 4))))
        data.append(row)

    return {
        "timeBins": num_frames,
        "freqBins": num_mel_bins,
        "timeAxis": time_axis,
        "freqAxis": freq_axis,
        "data": data,
    }


# ====================================================================
# PERSON B: TCN MODEL PREDICTIVE CODING STUB
# ====================================================================
def run_tcn_model(spectrogram_data: Dict[str, Any], machine_id: str) -> Dict[str, Any]:
    """
    Runs the Temporal Convolutional Network (TCN) predictive coder.
    
    PERSON B INTEGRATION POINT:
    Replace with model inference:
        model = load_tcn_checkpoint(machine_id)
        prediction = model(input_tensor)
        frame_errors = torch.mean((input_tensor - prediction) ** 2, dim=-1)
    """
    num_frames = spectrogram_data["timeBins"]
    threshold = DEFAULT_THRESHOLDS.get(machine_id, 0.0250)
    
    # Deterministic anomaly simulation for testing
    is_simulated_anomaly = False
    if file_bytes_has_anomaly(machine_id):
        is_simulated_anomaly = True

    frame_errors = []
    for t in range(num_frames):
        time_sec = round(t * 0.1, 1)
        base_err = 0.008 + 0.004 * math.sin(t * 0.3)
        
        # Inject realistic anomaly spike if triggered
        if is_simulated_anomaly and 4.2 <= time_sec <= 7.0:
            anomaly_spike = 0.045 * math.sin((time_sec - 4.2) * math.PI / 2.8)
            err_val = round(base_err + anomaly_spike, 4)
        else:
            err_val = round(base_err, 4)
            
        frame_errors.append({
            "time": time_sec,
            "error": err_val,
            "isAnomaly": err_val > threshold
        })

    # Clip-level anomaly score = Mean of top 10% highest frame prediction errors
    sorted_errors = sorted([f["error"] for f in frame_errors], reverse=True)
    top_k = max(1, int(len(sorted_errors) * 0.10))
    anomaly_score = round(float(np.mean(sorted_errors[:top_k])), 4)

    return {
        "frameErrors": frame_errors,
        "anomalyScore": anomaly_score,
    }


def file_bytes_has_anomaly(machine_id: str) -> bool:
    """Helper for demo determinism"""
    return machine_id in ["fan_id00", "valve_id02"]


# ====================================================================
# PERSON C: CONFORMAL CALIBRATION & DECISION PIPELINE
# ====================================================================
def run_ml_pipeline(file_bytes: Optional[bytes], filename: str, machine_id: str) -> Dict[str, Any]:
    """
    Orchestrates Person A, B, & C components into a unified response object.
    """
    meta = MACHINE_METADATA.get(machine_id, {
        "type": "Fan" if "fan" in machine_id else "Valve",
        "label": f"Machine — {machine_id}",
        "behavior": "Continuous acoustic profile",
    })
    
    # 1. Person A: Log-Mel Spectrogram Preprocessing
    spectrogram = preprocess_log_mel(file_bytes)
    
    # 2. Person B: TCN Predictive Coding Inference
    model_output = run_tcn_model(spectrogram, machine_id)
    anomaly_score = model_output["anomalyScore"]
    frame_errors = model_output["frameErrors"]
    
    # 3. Person C: Per-Machine-ID Conformal Thresholding
    threshold = DEFAULT_THRESHOLDS.get(machine_id, 0.0250)
    decision_margin = round(anomaly_score - threshold, 4)
    decision = "ANOMALY" if anomaly_score > threshold else "NORMAL"
    
    # Identify anomaly temporal regions if present
    anomaly_regions = []
    if decision == "ANOMALY":
        anomaly_regions.append({
            "startTime": 4.2,
            "endTime": 7.0,
            "peakError": max([f["error"] for f in frame_errors]),
            "description": f"High temporal residual error spike exceeding calibrated threshold ({threshold:.4f})."
        })

    return {
        "machineId": machine_id,
        "machineType": meta["type"],
        "machineLabel": meta["label"],
        "acousticBehavior": meta["behavior"],
        
        "anomalyScore": anomaly_score,
        "threshold": threshold,
        "decisionMargin": decision_margin,
        "decision": decision,
        
        "spectrogram": spectrogram,
        "frameErrors": frame_errors,
        "anomalyRegions": anomaly_regions,
        
        "audioMetadata": {
            "filename": filename,
            "duration": 10.0,
            "sampleRate": 16000,
            "channels": 1,
            "snr": "+6 dB",
            "fileSize": f"{round(len(file_bytes) / 1024, 1)} KB" if file_bytes else "312.5 KB",
        },
        "inferenceTimeMs": 350
    }
