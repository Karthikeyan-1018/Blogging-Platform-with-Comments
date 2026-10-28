import React from 'react';

export const MonthlyTrendChart = ({ monthlyTrends }) => {
  if (!monthlyTrends || !monthlyTrends.labels?.length) return null;
  const max = Math.max(...monthlyTrends.views);
  return (
    <div>
      <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
        Monthly Reader Traffic
      </h4>
      <div className="chart-group">
        <div className="chart-bars">
          {monthlyTrends.labels.map((label, idx) => (
            <div key={label} className="chart-column">
              <div className="chart-bar-value">{monthlyTrends.views[idx]}</div>
              <div
                className="chart-bar"
                style={{
                  height: `${Math.max(10, (monthlyTrends.views[idx] / Math.max(1, max)) * 100)}%`,
                  background: 'var(--accent-primary)'
                }}
              />
              <div className="chart-bar-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CategoryBreakdown = ({ categoryBreakdown }) => {
  if (!categoryBreakdown || !categoryBreakdown.labels?.length) return null;
  const max = Math.max(...categoryBreakdown.counts);
  return (
    <div>
      <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
        Views by Category
      </h4>
      <div className="cat-breakdown-list">
        {categoryBreakdown.labels.map((cat, idx) => (
          <div key={cat} className="cat-breakdown-row">
            <span className="cat-breakdown-label">{cat}</span>
            <div className="cat-breakdown-bar">
              <div
                style={{
                  width: `${(categoryBreakdown.counts[idx] / Math.max(1, max)) * 100}%`,
                  background: 'var(--accent-secondary)'
                }}
              />
            </div>
            <span className="cat-breakdown-count">{categoryBreakdown.counts[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AudiencePanel = ({ audience }) => {
  if (!audience) return null;
  const devices = Object.entries(audience.deviceDistribution || {});
  const geos = Object.entries(audience.geographicDistribution || {});
  if (devices.length === 0 || geos.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
      <div>
        <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
          Device Split
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {devices.map(([dev, val]) => (
            <div key={dev} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{dev}</span>
                <span>{val}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
          Geographic Audience
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {geos.map(([geo, val]) => (
            <div key={geo} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{geo}</span>
                <span>{val}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AnalyticsView = ({ monthlyTrends, categoryBreakdown, audience }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '20px' }}>
    <MonthlyTrendChart monthlyTrends={monthlyTrends} />
    <CategoryBreakdown categoryBreakdown={categoryBreakdown} />
    <AudiencePanel audience={audience} />
  </div>
);