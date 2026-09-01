import type { MachineEvaluationItem, RocCurveSeries } from '../types';

export const EVALUATION_TABLE_DATA: MachineEvaluationItem[] = [
  {
    machineId: 'fan_id00',
    machineType: 'Fan',
    auc: 0.94,
    pauc: 0.88,
    threshold: 0.0210,
    testClips: 400,
  },
  {
    machineId: 'fan_id02',
    machineType: 'Fan',
    auc: 0.91,
    pauc: 0.84,
    threshold: 0.0205,
    testClips: 400,
  },
  {
    machineId: 'fan_id04',
    machineType: 'Fan',
    auc: 0.95,
    pauc: 0.89,
    threshold: 0.0195,
    testClips: 400,
  },
  {
    machineId: 'fan_id06',
    machineType: 'Fan',
    auc: 0.92,
    pauc: 0.86,
    threshold: 0.0220,
    testClips: 400,
  },
  {
    machineId: 'valve_id00',
    machineType: 'Valve',
    auc: 0.87,
    pauc: 0.79,
    threshold: 0.0305,
    testClips: 400,
  },
  {
    machineId: 'valve_id02',
    machineType: 'Valve',
    auc: 0.89,
    pauc: 0.81,
    threshold: 0.0352,
    testClips: 400,
  },
  {
    machineId: 'valve_id04',
    machineType: 'Valve',
    auc: 0.90,
    pauc: 0.83,
    threshold: 0.0290,
    testClips: 400,
  },
  {
    machineId: 'valve_id06',
    machineType: 'Valve',
    auc: 0.88,
    pauc: 0.80,
    threshold: 0.0340,
    testClips: 400,
  },
];

// Helper to generate ROC curve points given a target AUC
function generateRocPoints(targetAuc: number): { fpr: number; tpr: number }[] {
  const points: { fpr: number; tpr: number }[] = [];
  const steps = 50;
  const k = Math.max(1, (1 / Math.max(0.51, 1 - targetAuc + 0.04)) - 0.8);

  for (let i = 0; i <= steps; i++) {
    const fpr = parseFloat((i / steps).toFixed(2));
    let tpr = 1 - Math.pow(1 - fpr, k);
    if (fpr === 0) tpr = 0;
    if (fpr === 1) tpr = 1;
    points.push({ fpr, tpr: parseFloat(Math.min(1.0, tpr).toFixed(3)) });
  }

  return points;
}

export const ROC_CURVES: Record<string, RocCurveSeries> = {
  all: {
    machineId: 'all',
    name: 'All Machines (Aggregate Mean AUC = 0.908)',
    auc: 0.908,
    color: '#2563eb',
    points: generateRocPoints(0.908),
  },
  fan_id00: {
    machineId: 'fan_id00',
    name: 'fan_id00 (AUC = 0.940)',
    auc: 0.94,
    color: '#059669',
    points: generateRocPoints(0.94),
  },
  fan_id02: {
    machineId: 'fan_id02',
    name: 'fan_id02 (AUC = 0.910)',
    auc: 0.91,
    color: '#0d9488',
    points: generateRocPoints(0.91),
  },
  fan_id04: {
    machineId: 'fan_id04',
    name: 'fan_id04 (AUC = 0.950)',
    auc: 0.95,
    color: '#10b981',
    points: generateRocPoints(0.95),
  },
  fan_id06: {
    machineId: 'fan_id06',
    name: 'fan_id06 (AUC = 0.920)',
    auc: 0.92,
    color: '#14b8a6',
    points: generateRocPoints(0.92),
  },
  valve_id00: {
    machineId: 'valve_id00',
    name: 'valve_id00 (AUC = 0.870)',
    auc: 0.87,
    color: '#d97706',
    points: generateRocPoints(0.87),
  },
  valve_id02: {
    machineId: 'valve_id02',
    name: 'valve_id02 (AUC = 0.890)',
    auc: 0.89,
    color: '#ea580c',
    points: generateRocPoints(0.89),
  },
  valve_id04: {
    machineId: 'valve_id04',
    name: 'valve_id04 (AUC = 0.900)',
    auc: 0.90,
    color: '#f59e0b',
    points: generateRocPoints(0.90),
  },
  valve_id06: {
    machineId: 'valve_id06',
    name: 'valve_id06 (AUC = 0.880)',
    auc: 0.88,
    color: '#c2410c',
    points: generateRocPoints(0.88),
  },
};
