import React, { useState, useEffect } from 'react';
import type { MachineId } from '../types';
import { Play, Square, Volume2 } from 'lucide-react';
import { playSyntheticMachineAudio, stopAudioPlayback } from '../services/audioSynthesizer';

interface AudioPlayerProps {
  machineId: MachineId;
  onTimeUpdate?: (currentTime: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ machineId, onTimeUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 10.0;

  useEffect(() => {
    // Reset playback state when machineId changes
    stopAudioPlayback();
    setIsPlaying(false);
    setCurrentTime(0);
    if (onTimeUpdate) onTimeUpdate(-1);
  }, [machineId]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudioPlayback();
      setIsPlaying(false);
      setCurrentTime(0);
      if (onTimeUpdate) onTimeUpdate(-1);
    } else {
      setIsPlaying(true);
      playSyntheticMachineAudio(
        machineId,
        (time) => {
          setCurrentTime(time);
          if (onTimeUpdate) onTimeUpdate(time);
        },
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (onTimeUpdate) onTimeUpdate(-1);
        }
      );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-panel-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        margin: '12px 0 16px 0',
      }}
    >
      <button
        type="button"
        className="btn-primary"
        style={{
          padding: '6px 14px',
          fontSize: '12px',
          backgroundColor: isPlaying ? 'var(--status-anomaly)' : 'var(--accent-primary)',
          borderColor: isPlaying ? 'var(--status-anomaly)' : 'var(--accent-hover)',
        }}
        onClick={handleTogglePlay}
      >
        {isPlaying ? (
          <>
            <Square size={13} fill="#ffffff" />
            <span>Stop Audio</span>
          </>
        ) : (
          <>
            <Play size={13} fill="#ffffff" />
            <span>Listen Audio Recording</span>
          </>
        )}
      </button>

      {/* Timeline Progress Bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Volume2 size={15} style={{ color: 'var(--text-secondary)' }} />
        <div
          style={{
            flex: 1,
            height: '6px',
            backgroundColor: 'var(--border-color)',
            borderRadius: '3px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(currentTime / duration) * 100}%`,
              backgroundColor: 'var(--accent-primary)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            minWidth: '70px',
          }}
        >
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </span>
      </div>
    </div>
  );
};
