import React from 'react';

const KPICard = ({ title, value, trend, iconClass, colorClass }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className={`kpi-icon-box ${colorClass}`}>
          <i className={`fa-regular ${iconClass}`}></i>
        </div>
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
            <i className={`fa-solid ${trend.startsWith('-') ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i> {trend.replace(/^[+-]/, '')} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>vs last month</span>
          </>
        )}
      </div>
    </div>
  );
};

export default KPICard;
