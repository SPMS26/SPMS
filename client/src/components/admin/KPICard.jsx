import React from 'react';

const KPICard = ({ title, value, trend, iconClass, colorClass, sparklinePoints = [] }) => {
  const width = 200;
  const height = 30;
  const max = sparklinePoints.length > 0 ? Math.max(...sparklinePoints) : 1;
  const min = sparklinePoints.length > 0 ? Math.min(...sparklinePoints) : 0;

  const coords = sparklinePoints.map((val, idx) => {
    const x = (idx / (sparklinePoints.length - 1)) * width;
    const y = height - ((val - min) / (max - min || 1)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  let strokeColor = '#f59e0b';
  if (colorClass === 'kpi-icon-green') strokeColor = '#10b981';
  if (colorClass === 'kpi-icon-purple') strokeColor = '#a855f7';
  if (colorClass === 'kpi-icon-orange') strokeColor = '#ea580c';

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
            <i className="fa-solid fa-arrow-up"></i> {trend} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>from Apr</span>
          </>
        )}
      </div>
      {sparklinePoints.length > 0 && (
        <div style={{ height: '30px', marginTop: '0.5rem' }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <polyline fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={coords} />
          </svg>
        </div>
      )}
    </div>
  );
};

export default KPICard;
