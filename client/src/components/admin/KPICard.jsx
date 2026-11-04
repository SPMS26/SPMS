import React from 'react';

const KPICard = ({ title, value, trend }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{title}</div>
        </div>
      </div>
      <div className="kpi-val-row">
        <div className="kpi-value">{value}</div>
      </div>
      <div className="kpi-trend">
        {trend && (
          <>
            {trend} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>vs last month</span>
          </>
        )}
      </div>
    </div>
  );
};

export default KPICard;
