import React, { useState } from 'react';
import type { InferenceResult } from '../types';
import { ScoreIndicator } from './ScoreIndicator';
import { Spectrogram } from './Spectrogram';
import { PredictionErrorChart } from './PredictionErrorChart';
import { AudioPlayer } from './AudioPlayer';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ResultPanelProps {
  result: InferenceResult;
  onReset: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ result, onReset }) => {
  const [playbackTime, setPlaybackTime] = useState<number>(-1);

  const isAnomaly = result.decision === 'ANOMALY';

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Result Metrics Grid Card */}
      <div className="panel" style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              DIAGNOSTIC RESULT
            </span>

            <div className={`status-badge ${isAnomaly ? 'anomaly' : 'normal'}`}>
              {isAnomaly ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              <span>{result.decision}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onReset}>
              <RotateCcw size={13} />
              <span>Reset / Analyze Another</span>
            </button>
          </div>
        </div>

        {/* Technical Value Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Machine ID */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="label">MACHINE ID</div>
            <div className="mono-val" style={{ fontSize: '18px', marginTop: '4px', color: 'var(--text-primary)' }}>
              {result.machineId}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {result.machineType} ({(result.acousticBehavior || '').includes('Periodic') ? 'Periodic' : 'Event-driven'})
            </div>
          </div>

          {/* Anomaly Score (Prominent) */}
          <div
            style={{
              padding: '12px',
              backgroundColor: isAnomaly ? 'var(--status-anomaly-bg)' : 'var(--bg-panel-subtle)',
              border: `1px solid ${isAnomaly ? 'var(--status-anomaly-border)' : 'var(--border-color-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="label" style={{ color: isAnomaly ? 'var(--status-anomaly)' : 'var(--text-secondary)' }}>
              ANOMALY SCORE
            </div>
            <div
              className="mono-val"
              style={{
                fontSize: '22px',
                marginTop: '2px',
                color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)',
              }}
            >
              {result.anomalyScore.toFixed(4)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Aggregate sequence predictive residual
            </div>
          </div>

          {/* Calibrated Threshold (Prominent) */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="label">CALIBRATED THRESHOLD (τ_cal)</div>
            <div className="mono-val" style={{ fontSize: '22px', marginTop: '2px', color: 'var(--text-primary)' }}>
              {result.threshold.toFixed(4)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Conformal quantile (α = 0.05)
            </div>
          </div>

          {/* Decision Margin */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="label">DECISION MARGIN</div>
            <div
              className="mono-val"
              style={{
                fontSize: '22px',
                marginTop: '2px',
                color: result.decisionMargin > 0 ? 'var(--status-anomaly)' : 'var(--status-normal)',
              }}
            >
              {result.decisionMargin > 0 ? `+${result.decisionMargin.toFixed(4)}` : result.decisionMargin.toFixed(4)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Score minus threshold delta
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer machineId={result.machineId as any} onTimeUpdate={(t) => setPlaybackTime(t)} />

        {/* Horizontal Score Scale */}
        <ScoreIndicator
          score={result.anomalyScore}
          threshold={result.threshold}
          decision={result.decision}
        />
      </div>

      {/* Spectrogram & Temporal Prediction Error */}
      <Spectrogram spectrogram={result.spectrogram} currentTime={playbackTime} />
      
      <PredictionErrorChart
        frameErrors={result.frameErrors}
        threshold={result.threshold}
        anomalyRegions={result.anomalyRegions || []}
        currentTime={playbackTime}
      />
    </div>
  );
};
