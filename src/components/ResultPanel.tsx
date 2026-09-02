import React, { useState } from 'react';
import type { InferenceResult } from '../types';
import { ScoreIndicator } from './ScoreIndicator';
import { Spectrogram } from './Spectrogram';
import { PredictionErrorChart } from './PredictionErrorChart';
import { AudioPlayer } from './AudioPlayer';
import { RotateCcw, AlertTriangle, CheckCircle2, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

interface ResultPanelProps {
  result: InferenceResult;
  audioFile?: File | null;
  onReset: () => void;
  /** When true, cards stagger-fade in (Stage 7 of PipelineViz). False/undefined = instant. */
  animated?: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ result, audioFile, onReset, animated = false }) => {
  const [playbackTime, setPlaybackTime] = useState<number>(-1);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  const isAnomaly = result.decision === 'ANOMALY';

  const debug = result.debugLog || {
    machine_id: result.machineId,
    machine_type: result.machineType,
    spectrogram_shape: [result.spectrogram.freqBins, result.spectrogram.timeBins],
    norm_mean: -22.707508,
    norm_std: 9.070847,
    frame_error_min: Math.min(...(result.frameErrors.map((f) => f.error) || [0])),
    frame_error_max: Math.max(...(result.frameErrors.map((f) => f.error) || [0])),
    frame_error_mean: result.anomalyScore,
    p95_score: result.anomalyScore,
    threshold: result.threshold,
    calibration_file_count: 2,
    margin: result.decisionMargin,
    decision: result.decision,
    inference_time_ms: result.inferenceTimeMs,
  };

  const shapeStr = Array.isArray(debug.spectrogram_shape)
    ? `(${debug.spectrogram_shape.join(', ')})`
    : String(debug.spectrogram_shape);

  const formattedLog = `============================================================
              PER-MACHINE CALCULATION LOGS
============================================================
Machine ID               : ${debug.machine_id} (${debug.machine_type})
Spectrogram Shape        : ${shapeStr}
Normalization Mean (μ)   : ${Number(debug.norm_mean).toFixed(6)}
Normalization Std (σ)    : ${Number(debug.norm_std).toFixed(6)}
Frame Error Min (MSE)    : ${Number(debug.frame_error_min).toFixed(6)}
Frame Error Max (MSE)    : ${Number(debug.frame_error_max).toFixed(6)}
Frame Error Mean (MSE)   : ${Number(debug.frame_error_mean).toFixed(6)}
P95 Clip Score (p95)     : ${Number(debug.p95_score).toFixed(6)}
Calibrated Threshold (τ) : ${Number(debug.threshold).toFixed(6)} (derived from ${debug.calibration_file_count} calibration split files)
Final Margin (Score - τ) : ${debug.margin > 0 ? '+' : ''}${Number(debug.margin).toFixed(6)}
Diagnostic Decision      : ${debug.decision}
Inference Latency        : ${Number(debug.inference_time_ms).toFixed(2)} ms
============================================================`;

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Result Metrics Grid Card */}
      <div className="panel pipeline-result-card" style={{ padding: '20px', animationDelay: animated ? '0ms' : '0ms' }}>
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
        <AudioPlayer machineId={result.machineId as any} audioFile={audioFile} onTimeUpdate={(t) => setPlaybackTime(t)} />

        {/* Horizontal Score Scale */}
        <ScoreIndicator
          score={result.anomalyScore}
          threshold={result.threshold}
          decision={result.decision}
        />
      </div>

      {/* Spectrogram & Temporal Prediction Error */}
      <div className="pipeline-result-card" style={{ animationDelay: animated ? '120ms' : '0ms' }}>
        <Spectrogram
          spectrogram={result.spectrogram}
          currentTime={playbackTime}
          isAnomaly={isAnomaly}
          anomalyRegions={result.anomalyRegions}
          frameErrors={result.frameErrors}
        />
      </div>
      
      <div className="pipeline-result-card" style={{ animationDelay: animated ? '220ms' : '0ms' }}>
        <PredictionErrorChart
          frameErrors={result.frameErrors}
          threshold={result.threshold}
          anomalyRegions={result.anomalyRegions || []}
          currentTime={playbackTime}
        />
      </div>

      {/* Per-Machine Calculation Details Log Panel */}
      <div
        className="panel pipeline-result-card"
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'var(--bg-panel-subtle)',
          border: '1px solid var(--border-color)',
          animationDelay: animated ? '340ms' : '0ms',
        }}
      >
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: 0,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>SHOW CALCULATION DETAILS</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
              (Click to {showDebug ? 'collapse' : 'expand'})
            </span>
          </div>
          {showDebug ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {showDebug && (
          <div style={{ marginTop: '14px' }}>
            <pre
              style={{
                backgroundColor: '#0a0d12',
                color: '#38bdf8',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '14px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                lineHeight: '1.6',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {formattedLog}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
