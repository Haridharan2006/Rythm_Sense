import React, { useState } from 'react';
import { Header } from '../components/Header';
import { MachineSelector } from '../components/MachineSelector';
import { AudioUploader } from '../components/AudioUploader';
import { ResultPanel } from '../components/ResultPanel';
import type { MachineId, InferenceResult } from '../types';
import { predict } from '../services/inference';
import { Play, Loader2 } from 'lucide-react';

interface LiveAnalysisProps {
  initialMachineId?: MachineId;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({ initialMachineId = 'fan_id00' }) => {
  const [selectedMachineId, setSelectedMachineId] = useState<MachineId>(initialMachineId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [presetLoadedId, setPresetLoadedId] = useState<MachineId | null>(selectedMachineId);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [result, setResult] = useState<InferenceResult | null>(null);

  const handleFileSelect = (file: File | null, presetId?: MachineId) => {
    if (presetId) {
      setPresetLoadedId(presetId);
      setSelectedMachineId(presetId);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      if (file) setPresetLoadedId(null);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgressPercent(0);
    setProgressStage('Initializing model execution pipeline...');

    try {
      const res = await predict(selectedFile, selectedMachineId, {
        onProgress: (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        },
      });
      setResult(res);
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setIsAnalyzing(false);
  };

  return (
    <div>
      <Header
        title="Live Analysis"
        subtitle="Score an audio recording against the calibrated model for its machine ID."
        badge="DIAGNOSTICS WORKSTATION"
      />

      {/* Control Station Panel */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">RECORDING INPUT & MACHINE CONFIGURATION</div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Target Model: TCN-PC v0.1
          </span>
        </div>

        <div className="grid-2col" style={{ alignItems: 'start' }}>
          <MachineSelector
            selectedMachineId={selectedMachineId}
            onChange={(id) => {
              setSelectedMachineId(id);
              if (presetLoadedId) setPresetLoadedId(id);
            }}
            disabled={isAnalyzing}
          />

          <AudioUploader
            selectedFile={selectedFile}
            presetLoadedId={presetLoadedId}
            onFileSelect={handleFileSelect}
            selectedMachineId={selectedMachineId}
            disabled={isAnalyzing}
          />
        </div>

        {/* Analyze Button & Execution Controls */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Selected target: <strong className="font-mono">{selectedMachineId}</strong>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{
              padding: '10px 24px',
              fontSize: '13px',
            }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>RUNNING INFERENCE PIPELINE...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="#ffffff" />
                <span>ANALYZE RECORDING</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Progress Banner */}
        {isAnalyzing && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{progressStage}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{progressPercent}%</span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: 'var(--accent-primary)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Diagnostic Result Area */}
      {result && <ResultPanel result={result} onReset={handleReset} />}
    </div>
  );
};
