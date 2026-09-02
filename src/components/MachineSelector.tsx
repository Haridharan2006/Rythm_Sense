import React from 'react';
import type { MachineId } from '../types';
import { MACHINE_CONFIGS } from '../config/machines';
import { Info } from 'lucide-react';

interface MachineSelectorProps {
  selectedMachineId: MachineId;
  onChange: (machineId: MachineId) => void;
  disabled?: boolean;
}

export const MachineSelector: React.FC<MachineSelectorProps> = ({
  selectedMachineId,
  onChange,
  disabled = false,
}) => {
  const current = MACHINE_CONFIGS[selectedMachineId] || MACHINE_CONFIGS['fan_id00'];

  return (
    <div className="control-group">
      <label className="label" htmlFor="machine-id-select">
        Machine Identifier
      </label>
      <select
        id="machine-id-select"
        className="select-input"
        value={selectedMachineId}
        onChange={(e) => onChange(e.target.value as MachineId)}
        disabled={disabled}
      >
        <optgroup label="Fans (Continuous Acoustic Profile)">
          <option value="fan_id00">fan_id00 — HVAC Blower #00</option>
          <option value="fan_id02">fan_id02 — Cooling Tower #02</option>
        </optgroup>
        <optgroup label="Valves (Burst Acoustic Profile)">
          <option value="valve_id00">valve_id00 — Solenoid Valve #00</option>
          <option value="valve_id02">valve_id02 — Pneumatic Actuator #02</option>
        </optgroup>
      </select>

      {current && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-panel-subtle)',
            border: '1px solid var(--border-color-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{current.name}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({current.behavior})</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            τ<sub>cal</sub> = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{current.defaultThreshold.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

