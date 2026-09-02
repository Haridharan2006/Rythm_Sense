import type { MachineId } from '../types';

let audioCtx: AudioContext | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAudioPlayback() {
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
    } catch {
      // ignore
    }
    currentBufferSource = null;
  }
}

/**
 * Synthesizes realistic 10-second industrial acoustic WAV buffer matching the specified machine ID
 */
export function playSyntheticMachineAudio(
  machineId: MachineId,
  onProgress?: (currentTime: number, duration: number) => void,
  onEnded?: () => void
): { stop: () => void; duration: number } {
  stopAudioPlayback();

  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 10.0;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate audio samples in time domain
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (machineId === 'fan_id00') {
      // Fan baseline motor hum
      sample += 0.3 * Math.sin(2 * Math.PI * 120 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * 360 * t);
      sample += 0.08 * Math.sin(2 * Math.PI * 600 * t);
      // Low broadband wind noise
      sample += 0.04 * (Math.random() * 2 - 1);

      // Bearing friction anomaly (4.5s to 7.2s): harsh metallic rasp
      if (t >= 4.5 && t <= 7.2) {
        const envelope = Math.sin(((t - 4.5) / 2.7) * Math.PI);
        const friction = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 3400 * t);
        sample += 0.35 * envelope * friction;
      }
    } else if (machineId === 'fan_id02') {
      // Healthy fan smooth motor hum
      sample += 0.32 * Math.sin(2 * Math.PI * 150 * t);
      sample += 0.14 * Math.sin(2 * Math.PI * 450 * t);
      sample += 0.07 * Math.sin(2 * Math.PI * 750 * t);
      sample += 0.03 * (Math.random() * 2 - 1);
    } else if (machineId === 'valve_id00') {
      // Quiet background noise + actuations at t=2, 5, 8
      sample += 0.02 * (Math.random() * 2 - 1);
      [2.0, 5.0, 8.0].forEach(actTime => {
        if (Math.abs(t - actTime) < 0.15) {
          const dt = t - actTime;
          const env = Math.exp(-Math.abs(dt) * 30);
          sample += 0.4 * env * Math.sin(2 * Math.PI * 800 * t) + 0.2 * env * (Math.random() * 2 - 1);
        }
      });
    } else if (machineId === 'valve_id02') {
      // Valve actuations + air leak hiss anomaly (3.0s to 6.5s)
      sample += 0.02 * (Math.random() * 2 - 1);
      [1.5, 4.5, 7.5].forEach(actTime => {
        if (Math.abs(t - actTime) < 0.15) {
          const dt = t - actTime;
          const env = Math.exp(-Math.abs(dt) * 30);
          sample += 0.45 * env * Math.sin(2 * Math.PI * 900 * t);
        }
      });
      if (t >= 3.0 && t <= 6.5) {
        const env = Math.sin(((t - 3.0) / 3.5) * Math.PI);
        const hiss = (Math.random() * 2 - 1) * 0.4;
        sample += env * hiss;
      }
    }

    // Clip preventer
    data[i] = Math.max(-0.95, Math.min(0.95, sample));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  const startTime = ctx.currentTime;
  source.start(0);
  currentBufferSource = source;

  let animId: number;
  const updateProgress = () => {
    const elapsed = ctx.currentTime - startTime;
    if (elapsed <= duration && currentBufferSource === source) {
      if (onProgress) onProgress(elapsed, duration);
      animId = requestAnimationFrame(updateProgress);
    }
  };
  animId = requestAnimationFrame(updateProgress);

  source.onended = () => {
    cancelAnimationFrame(animId);
    if (currentBufferSource === source) {
      currentBufferSource = null;
    }
    if (onEnded) onEnded();
  };

  return {
    stop: () => {
      cancelAnimationFrame(animId);
      stopAudioPlayback();
    },
    duration,
  };
}
