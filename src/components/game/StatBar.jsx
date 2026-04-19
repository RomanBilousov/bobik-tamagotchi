export default function StatBar({ label, value, colorClass, description }) {
  const percentage = Math.max(0, Math.min(100, value));
  const isWarning = percentage < 20;

  return (
    <div className="stat-item">
      <div className="stat-label">
        <span style={{ color: isWarning ? '#ef4444' : 'inherit' }}>{label}</span>
        <span style={{ color: isWarning ? '#ef4444' : 'inherit' }}>{Math.floor(percentage)}%</span>
      </div>
      {description ? (
        <div className={`stat-description ${isWarning ? 'stat-description-warning' : ''}`}>
          {description}
        </div>
      ) : null}
      <div className="stat-bar-bg">
        <div className={`stat-bar-fill ${colorClass}`} style={{ width: `${percentage}%`, background: isWarning ? '#ef4444' : '' }}></div>
      </div>
    </div>
  );
}
