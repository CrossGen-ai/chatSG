import React from 'react';
import { PerformanceDashboard } from './PerformanceDashboard';

export const PerformancePanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <PerformanceDashboard />
    </div>
  );
};