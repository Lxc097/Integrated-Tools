import React from 'react';

export function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`metric-card ${accent}`}>
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
