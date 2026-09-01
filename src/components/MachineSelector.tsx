import React from 'react';
import type { MachineId } from '../types';
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
  const machineInfo: Record<MachineId, { name: string; type: string; behavior: string; calibratedThresh: number }> = {
    fan_id00: {
      name: 'Industrial HVAC Blower #00',
      type: 'Fan',
      behavior: 'Periodic / continuous acoustic behavior',
      calibratedThresh: 0.0210,
    },
    fan_id02: {
      name: 'Cooling Tower Fan #02',
      type: 'Fan',
      behavior: 'Periodic / continuous acoustic behavior',
      calibratedThresh: 0.0205,
    },
    fan_id04: {
      name: 'Exhaust Condenser Fan #04',
      type: 'Fan',
      behavior: 'Periodic / continuous acoustic behavior',
      calibratedThresh: 0.0195,
    },
    fan_id06: {
      name: 'Radial Intake Fan #06',
      type: 'Fan',
      behavior: 'Periodic / continuous acoustic behavior',
      calibratedThresh: 0.0220,
    },
    valve_id00: {
      name: 'High-Pressure Solenoid Valve #00',
      type: 'Valve',
      behavior: 'Event-driven / burst-like acoustic behavior',
      calibratedThresh: 0.0305,
    },
    valve_id02: {
      name: 'Pneumatic Actuator Valve #02',
      type: 'Valve',
      behavior: 'Event-driven / burst-like acoustic behavior',
      calibratedThresh: 0.0352,
    },
    valve_id04: {
      name: 'Hydraulic Control Valve #04',
      type: 'Valve',
      behavior: 'Event-driven / burst-like acoustic behavior',
      calibratedThresh: 0.0290,
    },
    valve_id06: {
      name: 'Pressure Relief Check Valve #06',
      type: 'Valve',
      behavior: 'Event-driven / burst-like acoustic behavior',
      calibratedThresh: 0.0340,
    },
  };

  const current = machineInfo[selectedMachineId];

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
          <option value="fan_id04">fan_id04 — Exhaust Condenser #04</option>
          <option value="fan_id06">fan_id06 — Radial Intake Fan #06</option>
        </optgroup>
        <optgroup label="Valves (Burst Acoustic Profile)">
          <option value="valve_id00">valve_id00 — Solenoid Valve #00</option>
          <option value="valve_id02">valve_id02 — Pneumatic Actuator #02</option>
          <option value="valve_id04">valve_id04 — Hydraulic Valve #04</option>
          <option value="valve_id06">valve_id06 — Check Valve #06</option>
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
            τ<sub>cal</sub> = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{current.calibratedThresh.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
