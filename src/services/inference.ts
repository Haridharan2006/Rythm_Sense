import type { MachineId, InferenceResult } from '../types';
import { MOCK_RESULTS } from '../data/mockResults';

export interface InferenceOptions {
  onProgress?: (stage: string, percent: number) => void;
}

/**
 * AcoustiGuard Inference API Service
 * 
 * NOTE FOR FUTURE BACKEND INTEGRATION:
 * To connect to your Python / Gradio / FastAPI backend:
 * 1. Replace the simulated async delay below with `fetch('http://localhost:7860/api/predict', ...)`
 * 2. Send `FormData` containing the file and `machine_id`.
 * 3. Return the parsed JSON conforming to `InferenceResult`.
 */
export async function predict(
  file: File | null,
  machineId: MachineId,
  options?: InferenceOptions
): Promise<InferenceResult> {
  const notify = options?.onProgress || (() => {});

  // Pipeline simulation stages
  notify('Loading audio signal...', 15);
  await new Promise((r) => setTimeout(r, 180));

  notify('Computing 128-bin Log-Mel Spectrogram (25ms window, 10ms hop)...', 40);
  await new Promise((r) => setTimeout(r, 220));

  notify('Running Temporal Convolutional Network (TCN) predictive encoder...', 70);
  await new Promise((r) => setTimeout(r, 200));

  notify('Applying machine-specific conformal calibration threshold...', 92);
  await new Promise((r) => setTimeout(r, 150));

  notify('Inference complete.', 100);

  // Retrieve baseline deterministic dummy result for machine ID
  const mockBase = MOCK_RESULTS[machineId];
  if (!mockBase) {
    throw new Error(`Invalid machine identifier: ${machineId}`);
  }

  // If a user uploaded a custom file, extract filename and size dynamically
  let updatedMetadata = mockBase.audioMetadata;
  if (file) {
    const sizeKb = (file.size / 1024).toFixed(1);
    updatedMetadata = {
      ...mockBase.audioMetadata,
      filename: file.name,
      fileSize: `${sizeKb} KB`,
    };
  }

  return {
    ...mockBase,
    audioMetadata: updatedMetadata,
  };
}

/**
 * Validates audio file extension and type
 */
export function validateAudioFile(file: File): { isValid: boolean; error?: string } {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.wav')) {
    return {
      isValid: false,
      error: `Invalid file format "${file.name}". AcoustiGuard requires uncompressed 16kHz WAV audio format (.wav).`,
    };
  }
  if (file.size > 50 * 1024 * 1024) {
    return {
      isValid: false,
      error: `File size exceeds 50 MB limit. Please upload a standard diagnostic clip (<10s).`,
    };
  }
  return { isValid: true };
}
