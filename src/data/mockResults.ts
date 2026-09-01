import type { MachineId, InferenceResult, SpectrogramData } from '../types';

// Helper function to generate realistic log-mel spectrogram energy matrix
function generateSpectrogramData(
  machineId: MachineId,
  numTime: number = 100,
  numFreq: number = 64
): SpectrogramData {
  const timeAxis = Array.from({ length: numTime }, (_, i) => parseFloat((i * 0.1).toFixed(1)));
  const freqAxis = Array.from({ length: numFreq }, (_, i) => Math.round(50 + (i / (numFreq - 1)) * 7950));

  const data: number[][] = Array.from({ length: numFreq }, () => new Array(numTime).fill(0));

  for (let f = 0; f < numFreq; f++) {
    const freq = freqAxis[f];
    for (let t = 0; t < numTime; t++) {
      const time = timeAxis[t];
      let val = 0.05; // background noise floor

      if (machineId === 'fan_id00') {
        // Continuous fan harmonics (120Hz, 360Hz, 600Hz, 1200Hz)
        if (Math.abs(freq - 120) < 60) val += 0.65;
        if (Math.abs(freq - 360) < 80) val += 0.45;
        if (Math.abs(freq - 600) < 100) val += 0.35;
        if (Math.abs(freq - 1200) < 150) val += 0.25;

        // Bearing friction anomaly (4.5s to 7.2s)
        if (time >= 4.5 && time <= 7.2 && freq >= 2500 && freq <= 6500) {
          val += 0.55 * Math.sin((time - 4.5) * Math.PI / 2.7) * (1 + 0.15 * Math.sin(t * 1.5));
        }
      } else if (machineId === 'fan_id02') {
        // Healthy fan harmonics
        if (Math.abs(freq - 150) < 60) val += 0.70;
        if (Math.abs(freq - 450) < 80) val += 0.48;
        if (Math.abs(freq - 750) < 100) val += 0.38;
        if (Math.abs(freq - 1500) < 150) val += 0.28;
        val += 0.05 * Math.sin(time * 6);
      } else if (machineId === 'fan_id04') {
        // Healthy Exhaust Condenser Fan harmonics (180Hz, 540Hz)
        if (Math.abs(freq - 180) < 70) val += 0.68;
        if (Math.abs(freq - 540) < 90) val += 0.42;
        if (Math.abs(freq - 1080) < 120) val += 0.30;
      } else if (machineId === 'fan_id06') {
        // Radial Intake Fan harmonics + Blade pitch flutter anomaly (t=2.2s to 6.8s)
        if (Math.abs(freq - 210) < 70) val += 0.60;
        if (Math.abs(freq - 630) < 90) val += 0.40;
        if (time >= 2.2 && time <= 6.8 && freq >= 1800 && freq <= 5200) {
          val += 0.58 * Math.sin((time - 2.2) * Math.PI / 4.6) * (1 + 0.25 * Math.cos(t * 2.1));
        }
      } else if (machineId === 'valve_id00') {
        // Valve actuations at t=2.0s, t=5.0s, t=8.0s
        const bursts = [2.0, 5.0, 8.0];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.25) {
            val += 0.60 * Math.exp(-Math.pow((time - b) / 0.12, 2));
          }
        });
      } else if (machineId === 'valve_id02') {
        // Valve actuations + Severe seal leak anomaly (t=3.0s to t=6.5s)
        const bursts = [1.5, 4.5, 7.5];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.25) {
            val += 0.65 * Math.exp(-Math.pow((time - b) / 0.12, 2));
          }
        });
        if (time >= 3.0 && time <= 6.5 && freq >= 2800) {
          val += 0.60 * (1 + 0.2 * Math.cos(time * 12)) * (freq / 8000);
        }
      } else if (machineId === 'valve_id04') {
        // Healthy Hydraulic Control Valve (actuations at t=1.8s, 4.2s, 7.0s, 9.1s)
        const bursts = [1.8, 4.2, 7.0, 9.1];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.20) {
            val += 0.55 * Math.exp(-Math.pow((time - b) / 0.10, 2));
          }
        });
      } else if (machineId === 'valve_id06') {
        // Check Valve with Cavitation chatter anomaly (t=4.0s to 8.2s)
        const bursts = [1.2, 3.8, 6.5, 8.8];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.22) {
            val += 0.60 * Math.exp(-Math.pow((time - b) / 0.11, 2));
          }
        });
        if (time >= 4.0 && time <= 8.2 && freq >= 1500 && freq <= 6800) {
          val += 0.62 * (1 + 0.3 * Math.sin(time * 18)) * (freq / 7500);
        }
      }

      const pseudoNoise = (Math.sin(f * 13.5 + t * 7.2) + Math.cos(f * 3.1 - t * 11.4)) * 0.03;
      data[f][t] = Math.max(0.02, Math.min(0.98, val + pseudoNoise));
    }
  }

  return { data, timeAxis, freqAxis, timeBins: numTime, freqBins: numFreq };
}

// Helper function to generate frame prediction error curve over 10 seconds
function generateFrameErrors(
  machineId: MachineId,
  threshold: number,
  numTime: number = 100
): { time: number; error: number; isAnomaly: boolean }[] {
  const frameErrors: { time: number; error: number; isAnomaly: boolean }[] = [];

  for (let i = 0; i < numTime; i++) {
    const time = parseFloat((i * 0.1).toFixed(1));
    let baseErr = 0.011;

    if (machineId === 'fan_id00') {
      if (time >= 4.5 && time <= 7.2) {
        const shape = Math.sin(((time - 4.5) / 2.7) * Math.PI);
        const ripple = 0.003 * Math.sin(time * 25);
        baseErr = 0.012 + 0.0265 * shape + ripple;
      } else {
        baseErr = 0.011 + 0.0025 * Math.sin(time * 8);
      }
    } else if (machineId === 'fan_id02') {
      baseErr = 0.013 + 0.0025 * Math.sin(time * 5) + 0.001 * Math.cos(time * 17);
    } else if (machineId === 'fan_id04') {
      baseErr = 0.010 + 0.002 * Math.sin(time * 6);
    } else if (machineId === 'fan_id06') {
      if (time >= 2.2 && time <= 6.8) {
        const shape = Math.sin(((time - 2.2) / 4.6) * Math.PI);
        const flutter = 0.004 * Math.sin(time * 22);
        baseErr = 0.013 + 0.034 * shape + flutter;
      } else {
        baseErr = 0.012 + 0.003 * Math.sin(time * 7);
      }
    } else if (machineId === 'valve_id00') {
      baseErr = 0.016 + 0.003 * Math.sin(time * 4);
      if (Math.abs(time - 2.0) < 0.3) baseErr += 0.008 * Math.exp(-Math.pow((time - 2.0) / 0.15, 2));
      if (Math.abs(time - 5.0) < 0.3) baseErr += 0.007 * Math.exp(-Math.pow((time - 5.0) / 0.15, 2));
      if (Math.abs(time - 8.0) < 0.3) baseErr += 0.008 * Math.exp(-Math.pow((time - 8.0) / 0.15, 2));
    } else if (machineId === 'valve_id02') {
      if (time >= 3.0 && time <= 6.5) {
        const shape = Math.sin(((time - 3.0) / 3.5) * Math.PI);
        const flutter = 0.005 * Math.sin(time * 30);
        baseErr = 0.018 + 0.048 * shape + flutter;
      } else {
        baseErr = 0.017 + 0.004 * Math.sin(time * 6);
      }
    } else if (machineId === 'valve_id04') {
      baseErr = 0.014 + 0.002 * Math.sin(time * 5);
      [1.8, 4.2, 7.0, 9.1].forEach(tAct => {
        if (Math.abs(time - tAct) < 0.25) baseErr += 0.006 * Math.exp(-Math.pow((time - tAct) / 0.12, 2));
      });
    } else if (machineId === 'valve_id06') {
      if (time >= 4.0 && time <= 8.2) {
        const shape = Math.sin(((time - 4.0) / 4.2) * Math.PI);
        const chatter = 0.006 * Math.sin(time * 35);
        baseErr = 0.017 + 0.041 * shape + chatter;
      } else {
        baseErr = 0.015 + 0.003 * Math.sin(time * 5);
      }
    }

    const err = parseFloat(Math.max(0.005, baseErr).toFixed(4));
    frameErrors.push({
      time,
      error: err,
      isAnomaly: err > threshold,
    });
  }

  return frameErrors;
}

export const MOCK_RESULTS: Record<MachineId, InferenceResult> = {
  fan_id00: {
    machineId: 'fan_id00',
    machineType: 'Fan',
    machineLabel: 'Industrial HVAC Blower #00',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0342,
    threshold: 0.0210,
    decisionMargin: 0.0132,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('fan_id00'),
    frameErrors: generateFrameErrors('fan_id00', 0.0210),
    anomalyRegions: [
      {
        startTime: 4.5,
        endTime: 7.2,
        peakError: 0.0385,
        description: 'High-frequency acoustic friction surge detected in 2.5-6.5 kHz band (bearing cage wear pattern).',
      },
    ],
    audioMetadata: {
      filename: 'fan_id00_rec_20260901_04.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+6 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 412,
  },

  fan_id02: {
    machineId: 'fan_id02',
    machineType: 'Fan',
    machineLabel: 'Cooling Tower Fan #02',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0147,
    threshold: 0.0205,
    decisionMargin: -0.0058,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('fan_id02'),
    frameErrors: generateFrameErrors('fan_id02', 0.0205),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'fan_id02_rec_20260901_12.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+8 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 388,
  },

  fan_id04: {
    machineId: 'fan_id04',
    machineType: 'Fan',
    machineLabel: 'Exhaust Condenser Fan #04',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0125,
    threshold: 0.0195,
    decisionMargin: -0.0070,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('fan_id04'),
    frameErrors: generateFrameErrors('fan_id04', 0.0195),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'fan_id04_rec_20260901_02.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+10 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 395,
  },

  fan_id06: {
    machineId: 'fan_id06',
    machineType: 'Fan',
    machineLabel: 'Radial Intake Fan #06',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0418,
    threshold: 0.0220,
    decisionMargin: 0.0198,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('fan_id06'),
    frameErrors: generateFrameErrors('fan_id06', 0.0220),
    anomalyRegions: [
      {
        startTime: 2.2,
        endTime: 6.8,
        peakError: 0.0478,
        description: 'Aerodynamic blade pitch resonance flutter anomaly detected in 1.8-5.2 kHz band.',
      },
    ],
    audioMetadata: {
      filename: 'fan_id06_rec_20260901_15.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+5 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 430,
  },

  valve_id00: {
    machineId: 'valve_id00',
    machineType: 'Valve',
    machineLabel: 'High-Pressure Solenoid Valve #00',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0278,
    threshold: 0.0305,
    decisionMargin: -0.0027,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('valve_id00'),
    frameErrors: generateFrameErrors('valve_id00', 0.0305),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'valve_id00_rec_20260901_08.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+12 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 445,
  },

  valve_id02: {
    machineId: 'valve_id02',
    machineType: 'Valve',
    machineLabel: 'Pneumatic Actuator Valve #02',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0614,
    threshold: 0.0352,
    decisionMargin: 0.0262,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('valve_id02'),
    frameErrors: generateFrameErrors('valve_id02', 0.0352),
    anomalyRegions: [
      {
        startTime: 3.0,
        endTime: 6.5,
        peakError: 0.0682,
        description: 'Turbulent gas leakage acoustic signature between actuation cycles (valve seat degradation).',
      },
    ],
    audioMetadata: {
      filename: 'valve_id02_rec_20260901_19.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+4 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 420,
  },

  valve_id04: {
    machineId: 'valve_id04',
    machineType: 'Valve',
    machineLabel: 'Hydraulic Control Valve #04',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0215,
    threshold: 0.0290,
    decisionMargin: -0.0075,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('valve_id04'),
    frameErrors: generateFrameErrors('valve_id04', 0.0290),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'valve_id04_rec_20260901_22.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+11 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 405,
  },

  valve_id06: {
    machineId: 'valve_id06',
    machineType: 'Valve',
    machineLabel: 'Pressure Relief Check Valve #06',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0532,
    threshold: 0.0340,
    decisionMargin: 0.0192,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('valve_id06'),
    frameErrors: generateFrameErrors('valve_id06', 0.0340),
    anomalyRegions: [
      {
        startTime: 4.0,
        endTime: 8.2,
        peakError: 0.0594,
        description: 'Fluid cavitation chatter and spring oscillation anomaly during relief cycle.',
      },
    ],
    audioMetadata: {
      filename: 'valve_id06_rec_20260901_27.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+5 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 438,
  },
};
