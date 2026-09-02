import type { MachineId, InferenceResult } from '../types';
import { MOCK_RESULTS } from '../data/mockResults';
import { API_BASE_URL, IS_MOCK_MODE } from '../config/machines';

export interface InferenceOptions {
  onProgress?: (stage: string, percent: number) => void;
  signal?: AbortSignal;
}

export type EngineStatus = 'READY' | 'OFFLINE' | 'MOCK';

/**
 * Checks the connectivity of the Python ML backend engine.
 */
export async function checkBackendHealth(): Promise<EngineStatus> {
  if (IS_MOCK_MODE) {
    return 'MOCK';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return 'READY';
    }

    return 'OFFLINE';
  } catch {
    return 'OFFLINE';
  }
}

/**
 * Validates audio file extension and type.
 */
export function validateAudioFile(
  file: File
): { isValid: boolean; error?: string } {
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
      error:
        'File size exceeds 50 MB limit. Please upload a standard diagnostic clip (<10s).',
    };
  }

  return { isValid: true };
}

/**
 * Analyzes audio using the Python ML backend.
 *
 * Request:
 *   POST /predict
 *
 * Multipart fields:
 *   file       - WAV file
 *   machine_id - selected machine ID
 */
export async function analyzeAudio(
  file: File | null,
  machineId: string,
  options?: InferenceOptions
): Promise<InferenceResult> {
  const notify = options?.onProgress || (() => { });

  /*
   * ------------------------------------------------------------
   * MOCK MODE
   * ------------------------------------------------------------
   */
  if (IS_MOCK_MODE) {
    notify('Running acoustic analysis (Mock Mode)...', 50);

    await new Promise((resolve) => setTimeout(resolve, 400));

    const mockBase =
      MOCK_RESULTS[machineId as MachineId] ||
      MOCK_RESULTS['fan_id00'];

    let updatedMetadata = mockBase.audioMetadata;

    if (file) {
      const sizeKb = (file.size / 1024).toFixed(1);

      updatedMetadata = {
        ...mockBase.audioMetadata,
        filename: file.name,
        fileSize: `${sizeKb} KB`,
      };
    }

    notify('Analysis complete.', 100);

    return {
      ...mockBase,
      audioMetadata: updatedMetadata,
    };
  }

  /*
   * ------------------------------------------------------------
   * REAL BACKEND
   * ------------------------------------------------------------
   */

  if (!file) {
    throw new Error('Please select a WAV file before running analysis.');
  }

  const validation = validateAudioFile(file);

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid audio file.');
  }

  notify('Preparing audio for analysis...', 15);

  const formData = new FormData();

  formData.append('file', file);
  formData.append('machine_id', machineId);

  const controller = new AbortController();

  const timeoutMs = 20000;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  /*
   * If the caller supplied an AbortSignal, propagate its
   * cancellation to our internal controller.
   */
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener(
        'abort',
        () => controller.abort(),
        { once: true }
      );
    }
  }

  try {
    notify('Extracting acoustic features...', 30);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errDetail = '';

      try {
        const errorJson = await response.json();

        errDetail =
          errorJson?.detail ||
          errorJson?.error ||
          response.statusText;
      } catch {
        errDetail = await response.text();
      }

      throw new Error(
        `Inference engine returned HTTP error ${response.status}: ${errDetail || 'Internal Server Error'
        }`
      );
    }

    notify('Processing model response...', 90);

    const data = await response.json();

    /*
     * ----------------------------------------------------------
     * RESPONSE VALIDATION
     * ----------------------------------------------------------
     *
     * anomalyScore is mandatory.
     *
     * threshold is allowed to be null because Person C has not
     * yet completed calibration.
     *
     * decision may be:
     *   NORMAL
     *   ANOMALY
     *   PENDING
     */

    if (
      typeof data !== 'object' ||
      data === null ||
      typeof data.anomalyScore !== 'number'
    ) {
      throw new Error(
        'Received malformed response payload from Python inference backend. anomalyScore is missing or invalid.'
      );
    }

    /*
     * Threshold:
     *
     * number → calibrated threshold available
     * null   → calibration not completed yet
     */
    let threshold: number | null = null;

    if (
      data.threshold !== null &&
      data.threshold !== undefined
    ) {
      if (typeof data.threshold !== 'number') {
        throw new Error(
          'Invalid threshold received from Python inference backend.'
        );
      }

      threshold = Number(data.threshold);
    }

    /*
     * Decision
     *
     * Until calibration is available, the backend should return
     * PENDING.
     */
    let decision: 'NORMAL' | 'ANOMALY' | 'PENDING';

    if (data.decision === 'ANOMALY') {
      decision = 'ANOMALY';
    } else if (data.decision === 'NORMAL') {
      decision = 'NORMAL';
    } else {
      decision = 'PENDING';
    }

    /*
     * Decision margin
     *
     * Only meaningful when a threshold exists.
     */
    const decisionMargin =
      threshold !== null
        ? Number(
          data.decisionMargin ??
          (data.anomalyScore - threshold)
        )
        : null;

    notify('Analysis complete.', 100);

    /*
     * ----------------------------------------------------------
     * NORMALIZE RESPONSE INTO FRONTEND CONTRACT
     * ----------------------------------------------------------
     */

    return {
      machineId:
        data.machineId || machineId,

      machineType:
        data.machineType ||
        (machineId.includes('fan') ? 'Fan' : 'Valve'),

      machineLabel:
        data.machineLabel ||
        `${machineId.includes('fan') ? 'Fan' : 'Valve'
        } — ${machineId}`,

      acousticBehavior:
        data.acousticBehavior ||
        (machineId.includes('fan')
          ? 'Periodic / continuous acoustic behavior'
          : 'Event-driven / burst-like acoustic behavior'),

      anomalyScore:
        Number(data.anomalyScore),

      threshold,

      decisionMargin,

      decision,

      spectrogram:
        data.spectrogram || {
          timeBins: 100,
          freqBins: 64,

          timeAxis: Array.from(
            { length: 100 },
            (_, i) => i * 0.1
          ),

          freqAxis: Array.from(
            { length: 64 },
            (_, i) => i * 125
          ),

          data: Array.from(
            { length: 64 },
            () => new Array(100).fill(0)
          ),
        },

      /*
       * Person C's scoring pipeline should return these
       * prediction-window errors.
       */
      frameErrors:
        Array.isArray(data.frameErrors)
          ? data.frameErrors.map(Number)
          : [],

      anomalyRegions:
        Array.isArray(data.anomalyRegions)
          ? data.anomalyRegions
          : [],

      audioMetadata: {
        filename:
          file.name ||
          data.audioMetadata?.filename ||
          `${machineId}_recording.wav`,

        duration:
          data.audioMetadata?.duration ?? 0,

        sampleRate:
          data.audioMetadata?.sampleRate ?? 16000,

        channels:
          data.audioMetadata?.channels ?? 1,

        snr:
          data.audioMetadata?.snr,

        fileSize:
          `${(file.size / 1024).toFixed(1)} KB`,
      },

      inferenceTimeMs:
        data.inferenceTimeMs !== undefined
          ? Number(data.inferenceTimeMs)
          : undefined,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Inference request timed out after ${timeoutMs / 1000
          } seconds while connecting to backend at ${API_BASE_URL}.`
        );
      }

      if (
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError')
      ) {
        throw new Error(
          `Unable to reach inference engine at ${API_BASE_URL}. Ensure the Python FastAPI server is running.`
        );
      }

      throw err;
    }

    throw new Error(
      'An unexpected error occurred during model inference.'
    );
  }
}

/**
 * Legacy predict function wrapper for existing frontend callers.
 */
export async function predict(
  file: File | null,
  machineId: MachineId,
  options?: InferenceOptions
): Promise<InferenceResult> {
  return analyzeAudio(file, machineId, options);
}