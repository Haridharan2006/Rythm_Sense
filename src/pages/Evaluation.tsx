import React from 'react';
import { Header } from '../components/Header';
import { EvaluationTable } from '../components/EvaluationTable';
import { AucChart } from '../components/AucChart';
import { RocChart } from '../components/RocChart';
import { EVALUATION_TABLE_DATA } from '../data/mockEvaluation';

export const Evaluation: React.FC = () => {
  return (
    <div>
      <Header
        title="Model Evaluation"
        subtitle="Performance measured independently for each machine identifier."
        badge="BENCHMARK VERIFICATION"
      />

      {/* Main Metrics Table */}
      <EvaluationTable data={EVALUATION_TABLE_DATA} />

      {/* Visual Charts Grid */}
      <div className="grid-2col" style={{ marginTop: '20px' }}>
        <AucChart data={EVALUATION_TABLE_DATA} />
        <RocChart />
      </div>
    </div>
  );
};
