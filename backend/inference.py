"""
Rythm Sense - Real ML Inference Integration

Contract 4:

predict(filepath, machine_id)
    -> (score, threshold, decision, spectrogram)

Pipeline:

WAV
  ↓
Person A - Log-Mel extraction
  ↓
Person B - TCN predictive coding
  ↓
Person C - P95 clip score
  ↓
Person C - Conformal calibration
  ↓
NORMAL / ANOMALY
"""

from pathlib import Path
from typing import Dict, Tuple

import json
import numpy as np

from extract_mel import extract_logmel
from person_c_eval import (
    load_tcn_model,
    compute_clip_score,
    conformal_threshold,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

CHECKPOINT_DIR = BASE_DIR / "checkpoints"

HANDOFF_DIR = BASE_DIR / "handoff_data"

CALIBRATION_FILE = HANDOFF_DIR / "calibration_splits.json"


# ============================================================
# SUPPORTED MACHINES
# ============================================================

MACHINE_CONFIG = {
    "fan_00": {
        "machine_type": "Fan",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_fan_00.pt",

        "norm_stats":
            BASE_DIR / "norm_stats_fan_00.npy",
    },

    "valve_00": {
        "machine_type": "Valve",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_valve_00.pt",

        "norm_stats":
            BASE_DIR / "norm_stats_valve_00.npy",
    },
}


SUPPORTED_MACHINES = {
    "fan_00": "Fan",
    "valve_00": "Valve",
}


# ============================================================
# OPTIONAL FRONTEND COMPATIBILITY
# ============================================================

# Your older frontend used names such as fan_id00.
# We translate them internally to the real handoff IDs.

MACHINE_ALIASES = {
    "fan_id00": "fan_00",
    "valve_id00": "valve_00",

    # Out-of-scope IDs.
    "fan_id02": "fan_00",
    "valve_id02": "valve_00",
}


def normalize_machine_id(machine_id: str) -> str:

    machine_id = machine_id.strip().lower()

    return MACHINE_ALIASES.get(
        machine_id,
        machine_id,
    )


# ============================================================
# MODEL CACHE
# ============================================================

MODEL_CACHE = {}

THRESHOLD_CACHE = {}


# ============================================================
# LOAD CALIBRATION FILE
# ============================================================

def load_calibration_splits():

    if not CALIBRATION_FILE.exists():

        raise FileNotFoundError(
            f"Calibration file not found: {CALIBRATION_FILE}"
        )

    with open(
        CALIBRATION_FILE,
        "r",
        encoding="utf-8",
    ) as f:

        return json.load(f)


# ============================================================
# FIND CALIBRATION FILES
# ============================================================

def get_calibration_files(machine_id: str):

    data = load_calibration_splits()

    machine_id = normalize_machine_id(machine_id)

    # Handle common JSON structures.

    if machine_id in data:

        machine_data = data[machine_id]

    elif f"{machine_id}" in data:

        machine_data = data[f"{machine_id}"]

    else:

        raise KeyError(
            f"No calibration split found for {machine_id}"
        )


    # The handoff may store the paths under different keys.
    # Try the common forms.

    for key in [
        "normal",
        "normal_files",
        "calibration",
        "calibration_files",
        "files",
    ]:

        if key in machine_data:

            files = machine_data[key]

            if isinstance(files, list):

                return files


    # If the machine data itself is a list.

    if isinstance(machine_data, list):

        return machine_data


    raise ValueError(
        f"Unable to determine calibration files for {machine_id}"
    )


# ============================================================
# RESOLVE CALIBRATION PATH
# ============================================================

def resolve_calibration_path(path_value):

    path_value = Path(path_value)

    candidates = [

        # Already absolute.
        path_value,

        # Relative to repository root.
        BASE_DIR / path_value,

        # Relative to handoff_data.
        HANDOFF_DIR / path_value,

    ]

    for candidate in candidates:

        if candidate.exists():

            return candidate.resolve()


    raise FileNotFoundError(
        f"Calibration audio file not found: {path_value}"
    )


# ============================================================
# LOAD MODEL
# ============================================================

def get_model(machine_id: str):

    machine_id = normalize_machine_id(machine_id)

    if machine_id not in MACHINE_CONFIG:

        raise ValueError(
            f"Unsupported machine ID: {machine_id}"
        )


    if machine_id in MODEL_CACHE:

        return MODEL_CACHE[machine_id]


    config = MACHINE_CONFIG[machine_id]


    if not config["checkpoint"].exists():

        raise FileNotFoundError(
            f"Checkpoint not found: "
            f"{config['checkpoint']}"
        )


    if not config["norm_stats"].exists():

        raise FileNotFoundError(
            f"Normalization statistics not found: "
            f"{config['norm_stats']}"
        )


    print(
        f"[Rythm Sense] Loading model for {machine_id}"
    )


    model = load_tcn_model(
        str(config["checkpoint"]),
        str(config["norm_stats"]),
    )


    MODEL_CACHE[machine_id] = model


    return model


# ============================================================
# COMPUTE CALIBRATION THRESHOLD
# ============================================================

def get_threshold(machine_id: str):

    machine_id = normalize_machine_id(machine_id)


    # IMPORTANT:
    # Never recompute the conformal threshold for every
    # uploaded audio file.

    if machine_id in THRESHOLD_CACHE:

        return THRESHOLD_CACHE[machine_id]


    print(
        f"[Rythm Sense] Computing conformal threshold "
        f"for {machine_id}..."
    )


    model = get_model(machine_id)

    calibration_files = get_calibration_files(
        machine_id
    )


    calibration_scores = []


    for file_value in calibration_files:

        filepath = resolve_calibration_path(
            file_value
        )


        spectrogram = extract_logmel(
            filepath
        )


        score = compute_clip_score(
            model,
            spectrogram,
        )


        calibration_scores.append(
            float(score)
        )


    if len(calibration_scores) == 0:

        raise ValueError(
            f"No calibration scores available for "
            f"{machine_id}"
        )


    threshold = conformal_threshold(
        np.asarray(
            calibration_scores,
            dtype=float,
        ),

        alpha=0.05,
    )


    threshold = float(threshold)


    THRESHOLD_CACHE[machine_id] = threshold


    print(
        f"[Rythm Sense] "
        f"{machine_id} threshold = "
        f"{threshold:.6f}"
    )


    return threshold


# ============================================================
# MAIN CONTRACT 4 FUNCTION
# ============================================================

def predict(
    filepath,
    machine_id: str,
) -> Tuple[
    float,
    float,
    str,
    np.ndarray,
]:

    machine_id = normalize_machine_id(
        machine_id
    )


    if machine_id not in MACHINE_CONFIG:

        raise ValueError(
            f"Unsupported machine ID '{machine_id}'. "
            f"Use fan_00 or valve_00."
        )


    filepath = Path(filepath)


    if not filepath.exists():

        raise FileNotFoundError(
            f"Audio file not found: {filepath}"
        )


    # --------------------------------------------------------
    # PERSON A
    # --------------------------------------------------------

    print(
        f"[Rythm Sense] "
        f"Extracting Log-Mel: {filepath.name}"
    )


    spectrogram = extract_logmel(
        filepath
    )


    # --------------------------------------------------------
    # PERSON B
    # --------------------------------------------------------

    model = get_model(
        machine_id
    )


    print(
        f"[Rythm Sense] "
        f"Running TCN inference: {machine_id}"
    )


    score = compute_clip_score(
        model,
        spectrogram,
    )


    score = float(score)


    # --------------------------------------------------------
    # PERSON C
    # --------------------------------------------------------

    threshold = get_threshold(
        machine_id
    )


    # --------------------------------------------------------
    # DECISION
    # --------------------------------------------------------

    if score > threshold:

        decision = "ANOMALY"

    else:

        decision = "NORMAL"


    print(
        f"[Rythm Sense] "
        f"Score={score:.6f} | "
        f"Threshold={threshold:.6f} | "
        f"Decision={decision}"
    )


    return (
        score,
        threshold,
        decision,
        spectrogram,
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print(
        "Supported machines:"
    )

    for machine in MACHINE_CONFIG:

        print(
            f"  - {machine}"
        )

    print(
        "\nModel/threshold loading test..."
    )

    for machine in MACHINE_CONFIG:

        try:

            model = get_model(
                machine
            )

            threshold = get_threshold(
                machine
            )

            print(
                f"\n{machine}"
            )

            print(
                f"  Model: loaded"
            )

            print(
                f"  Threshold: {threshold:.6f}"
            )

        except Exception as exc:

            print(
                f"\n{machine} FAILED:"
            )

            print(
                f"  {exc}"
            )